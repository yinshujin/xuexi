/**
 * Little sounds for the 单元闯关 (right, wrong, combo, finish), synthesised
 * with Web Audio so the app ships no sound files. Quiet, short, and silent
 * when the device has no audio.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', volume = 0.12) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  right() {
    tone(784, 0, 0.12); // G5
    tone(1175, 0.09, 0.22); // D6
  },
  wrong() {
    tone(196, 0, 0.18, 'triangle', 0.1);
    tone(165, 0.12, 0.25, 'triangle', 0.1);
  },
  combo() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.16));
  },
  tap() {
    tone(660, 0, 0.05, 'sine', 0.06);
  },
  finish() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, i === 5 ? 0.5 : 0.18, 'triangle', 0.1));
  },
};
