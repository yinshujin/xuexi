import type { AudioPort } from './engine';

/**
 * AudioPort backed by a single reusable HTMLAudioElement. Reusing one element
 * keeps iOS Safari / Android WebView happy once the first play was triggered by
 * a user gesture (autoplay policies).
 */
export function createHtmlAudioPort(el: HTMLAudioElement = new Audio()): AudioPort {
  let rate = 1;
  let settle: { resolve: () => void; reject: (e: Error) => void } | null = null;

  const finish = (err?: Error) => {
    const s = settle;
    settle = null;
    el.onended = el.onerror = null;
    if (!s) return;
    if (err) s.reject(err);
    else s.resolve();
  };

  return {
    play(src, r) {
      finish(new Error('superseded'));
      rate = r;
      return new Promise<void>((resolve, reject) => {
        settle = { resolve, reject };
        el.onended = () => finish();
        el.onerror = () => finish(new Error('audio error'));
        el.src = src;
        el.playbackRate = rate;
        el.play().catch((e: unknown) => finish(e instanceof Error ? e : new Error(String(e))));
      });
    },
    pause() {
      el.pause();
    },
    resume() {
      if (settle) el.play().catch((e: unknown) => finish(e instanceof Error ? e : new Error(String(e))));
    },
    stop() {
      el.pause();
      finish(new Error('stopped'));
    },
    setRate(r) {
      rate = r;
      el.playbackRate = r;
    },
  };
}

/** Silent AudioPort (tests, or when sound is muted): plays nothing, rejects so the engine uses timed waits. */
export const silentAudioPort: AudioPort = {
  play: () => Promise.reject(new Error('silent')),
  pause() {},
  resume() {},
  stop() {},
  setRate() {},
};
