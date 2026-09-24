/**
 * Lesson playback engine for pre-generated course packs.
 *
 * Inspired by OpenMAIC's PlaybackEngine (MIT), simplified for offline playback:
 * no live discussion, no model calls. Walks Scene.actions[] in order:
 * - speech: shows the subtitle and plays pre-synthesized narration (or waits an
 *   estimated reading time when the clip is missing / cannot play);
 * - spotlight / laser: fire-and-forget effects, cleared after the next speech;
 * - wb_*: whiteboard reducer + a short animation pause;
 * - quiz / interactive scenes stop at the end and wait for the child (`continue()`).
 */
import type { Action } from '@openmaic/dsl';
import { estimateSpeechMs, type PackLesson } from '@xuexi/course-pack';
import {
  applyWhiteboardAction,
  EMPTY_WHITEBOARD,
  isWhiteboardAction,
  type WhiteboardState,
} from './whiteboard';

export type PlayerStatus = 'idle' | 'playing' | 'paused' | 'awaiting-user' | 'ended';

export interface PlayerEffects {
  spotlight?: { elementId: string; dimness?: number };
  laser?: { elementId: string; color?: string };
}

export interface PlayerSnapshot {
  status: PlayerStatus;
  sceneIndex: number;
  /** Index of the next action to run within the current scene. */
  actionIndex: number;
  subtitle: string | null;
  effects: PlayerEffects;
  whiteboard: WhiteboardState;
  rate: number;
  /** Actions executed so far across the lesson (for progress). */
  played: number;
  total: number;
}

/** Audio output. `play` resolves when the clip ends and rejects if stopped or unplayable. */
export interface AudioPort {
  play(src: string, rate: number): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  setRate(rate: number): void;
}

export interface EngineOptions {
  audio: AudioPort;
  /** Map a pack-relative audio path to a playable URL (null when unavailable). */
  resolveAudio: (path: string) => string | null;
  onChange: (snapshot: PlayerSnapshot) => void;
  /** Animation pause after a whiteboard action, ms at 1× (default 500). */
  whiteboardMs?: number;
  /** Speech duration estimate override (tests). */
  speechMs?: (text: string) => number;
}

class Cancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

/** A setTimeout that can be paused, resumed and cancelled. */
class PausableTimer {
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private remaining = 0;
  private startedAt = 0;
  private resolve: (() => void) | null = null;
  private reject: ((e: Error) => void) | null = null;
  private paused = false;

  wait(ms: number, startPaused: boolean): Promise<void> {
    this.cancel();
    return new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.remaining = ms;
      this.paused = startPaused;
      if (!startPaused) this.arm();
    });
  }

  private arm() {
    this.startedAt = Date.now();
    this.timeout = setTimeout(() => {
      this.timeout = null;
      const r = this.resolve;
      this.resolve = this.reject = null;
      r?.();
    }, this.remaining);
  }

  pause() {
    if (!this.resolve || this.paused) return;
    this.paused = true;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
    }
  }

  resume() {
    if (!this.resolve || !this.paused) return;
    this.paused = false;
    this.arm();
  }

  cancel() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
    const rej = this.reject;
    this.resolve = this.reject = null;
    rej?.(new Cancelled());
  }
}

export class LessonEngine {
  private readonly lesson: PackLesson;
  private readonly opts: Required<Omit<EngineOptions, 'speechMs'>> & { speechMs: (t: string) => number };
  private state: PlayerSnapshot;
  private run = 0;
  private timer = new PausableTimer();
  private clearEffectsAfterSpeech = false;
  private readonly offsets: number[];

  constructor(lesson: PackLesson, options: EngineOptions) {
    this.lesson = lesson;
    this.opts = {
      whiteboardMs: 500,
      speechMs: estimateSpeechMs,
      ...options,
    } as LessonEngine['opts'];
    this.offsets = [];
    let n = 0;
    for (const s of lesson.scenes) {
      this.offsets.push(n);
      n += s.actions?.length ?? 0;
    }
    this.state = {
      status: 'idle',
      sceneIndex: 0,
      actionIndex: 0,
      subtitle: null,
      effects: {},
      whiteboard: EMPTY_WHITEBOARD,
      rate: 1,
      played: 0,
      total: n,
    };
  }

  get snapshot(): PlayerSnapshot {
    return this.state;
  }

  get sceneCount(): number {
    return this.lesson.scenes.length;
  }

  private set(patch: Partial<PlayerSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.opts.onChange(this.state);
  }

  /** Start (or restart after ending) from the current scene. */
  play() {
    const s = this.state.status;
    if (s === 'paused') return this.resume();
    if (s === 'playing' || s === 'awaiting-user') return;
    if (s === 'ended') return this.goToScene(0, true);
    this.startRun(this.state.sceneIndex, this.state.actionIndex);
  }

  pause() {
    if (this.state.status !== 'playing') return;
    this.opts.audio.pause();
    this.timer.pause();
    this.set({ status: 'paused' });
  }

  resume() {
    if (this.state.status !== 'paused') return;
    this.set({ status: 'playing' });
    // A run may not exist yet (paused right after a seek): start one.
    if (!this.running) {
      this.startRun(this.state.sceneIndex, this.state.actionIndex);
      return;
    }
    this.opts.audio.resume();
    this.timer.resume();
    this.flushResumeWaiters();
  }

  /** Called by quiz / interactive scenes when the child is done. */
  continue() {
    if (this.state.status !== 'awaiting-user') return;
    const next = this.state.sceneIndex + 1;
    if (next >= this.lesson.scenes.length) {
      this.set({ status: 'ended', subtitle: null, effects: {} });
      return;
    }
    this.startRun(next, 0);
  }

  setRate(rate: number) {
    this.opts.audio.setRate(rate);
    this.set({ rate });
  }

  /** Jump to the start of a scene. `autoplay` keeps playing, otherwise pauses there. */
  goToScene(index: number, autoplay = this.state.status === 'playing') {
    const i = Math.max(0, Math.min(index, this.lesson.scenes.length - 1));
    this.cancelRun();
    // Rebuild the whiteboard as it is at the start of scene i.
    let wb = EMPTY_WHITEBOARD;
    for (let k = 0; k < i; k++) {
      for (const a of this.lesson.scenes[k].actions ?? []) {
        if (isWhiteboardAction(a)) wb = applyWhiteboardAction(wb, a);
      }
    }
    this.set({
      sceneIndex: i,
      actionIndex: 0,
      whiteboard: wb,
      effects: {},
      subtitle: null,
      played: this.offsets[i],
      status: autoplay ? 'playing' : 'paused',
    });
    if (autoplay) this.startRun(i, 0);
  }

  /** "再讲一遍": replay the current scene from its beginning. */
  replayScene() {
    this.goToScene(this.state.sceneIndex, true);
  }

  destroy() {
    this.cancelRun();
  }

  // ---------------------------------------------------------------------------

  private running = false;

  private cancelRun() {
    this.run += 1;
    this.running = false;
    this.opts.audio.stop();
    this.timer.cancel();
    this.flushResumeWaiters();
  }

  private startRun(sceneIndex: number, actionIndex: number) {
    this.cancelRun();
    const token = this.run;
    this.running = true;
    this.set({ status: 'playing', sceneIndex, actionIndex });
    this.loop(token, sceneIndex, actionIndex).catch((e) => {
      if (!(e instanceof Cancelled)) console.error('[player]', e);
    });
  }

  private alive(token: number) {
    if (token !== this.run) throw new Cancelled();
  }

  private async loop(token: number, sceneIndex: number, actionIndex: number) {
    for (let si = sceneIndex; si < this.lesson.scenes.length; si++) {
      const scene = this.lesson.scenes[si];
      const actions = scene.actions ?? [];
      if (si !== sceneIndex) {
        this.set({ sceneIndex: si, actionIndex: 0, effects: {}, subtitle: null });
      }
      for (let ai = si === sceneIndex ? actionIndex : 0; ai < actions.length; ai++) {
        this.alive(token);
        await this.untilResumed();
        this.alive(token);
        this.set({ actionIndex: ai });
        await this.exec(token, actions[ai]);
        this.alive(token);
        this.set({ actionIndex: ai + 1, played: this.offsets[si] + ai + 1 });
      }
      if (scene.type === 'quiz' || scene.type === 'interactive') {
        this.running = false;
        this.set({ status: 'awaiting-user', subtitle: null, effects: {} });
        return;
      }
    }
    this.running = false;
    this.set({ status: 'ended', subtitle: null, effects: {} });
  }

  private resumeWaiters: Array<() => void> = [];

  /** Resolves immediately unless paused; otherwise when resumed or cancelled. */
  private untilResumed(): Promise<void> {
    if (this.state.status !== 'paused') return Promise.resolve();
    return new Promise((resolve) => this.resumeWaiters.push(resolve));
  }

  private flushResumeWaiters() {
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    waiters.forEach((w) => w());
  }

  private wait(ms: number) {
    return this.timer.wait(ms / this.state.rate, this.state.status === 'paused');
  }

  private async exec(token: number, a: Action) {
    switch (a.type) {
      case 'speech': {
        this.set({ subtitle: a.text });
        const src = a.audioId ? this.opts.resolveAudio(a.audioId) : null;
        let played = false;
        if (src) {
          try {
            await this.opts.audio.play(src, this.state.rate);
            played = true;
          } catch {
            this.alive(token); // stopped by a seek → propagate cancellation
          }
        }
        if (!played) await this.wait(this.opts.speechMs(a.text));
        if (this.clearEffectsAfterSpeech) {
          this.clearEffectsAfterSpeech = false;
          this.set({ effects: {} });
        }
        return;
      }
      case 'spotlight':
        this.clearEffectsAfterSpeech = true;
        this.set({
          effects: { ...this.state.effects, spotlight: { elementId: a.elementId, dimness: a.dimOpacity } },
        });
        return;
      case 'laser':
        this.clearEffectsAfterSpeech = true;
        this.set({ effects: { ...this.state.effects, laser: { elementId: a.elementId, color: a.color } } });
        return;
      default:
        if (isWhiteboardAction(a)) {
          this.set({ whiteboard: applyWhiteboardAction(this.state.whiteboard, a) });
          await this.wait(this.opts.whiteboardMs);
        }
      // play_video / widget_* are no-ops in offline playback.
    }
  }
}
