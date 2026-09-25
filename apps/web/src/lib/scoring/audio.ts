/**
 * Recording → 16 kHz mono 16-bit PCM → 40 ms base64 frames (1280 bytes each),
 * the format 讯飞 ISE expects.
 */

type AudioCtor = typeof AudioContext;

function audioContextCtor(): AudioCtor {
  const w = globalThis as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  const C = w.AudioContext ?? w.webkitAudioContext;
  if (!C) throw new Error('这台设备不能处理录音');
  return C;
}

/** Decode any recording the browser can play (webm/opus, mp4/aac …) to 16 kHz mono float samples. */
export async function toPCM16k(blob: Blob): Promise<Float32Array> {
  const buf = await blob.arrayBuffer();
  const AC = audioContextCtor();
  const decode = async (ctx: AudioContext) => {
    try {
      const audio = await ctx.decodeAudioData(buf.slice(0));
      return { data: audio.getChannelData(0).slice(), rate: audio.sampleRate };
    } finally {
      void ctx.close();
    }
  };
  let out: { data: Float32Array; rate: number };
  try {
    out = await decode(new AC({ sampleRate: 16000 }));
  } catch {
    out = await decode(new AC());
  }
  return Math.abs(out.rate - 16000) < 1 ? out.data : resample(out.data, out.rate, 16000);
}

/** Linear-interpolation resampling. */
export function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.round(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = pos - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

/** Float samples → 16-bit little-endian PCM bytes. */
export function toInt16(pcm: Float32Array): Uint8Array {
  const out = new Uint8Array(pcm.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

/** 1280-byte (40 ms) base64 frames. */
export function toBase64Frames(bytes: Uint8Array, frameSize = 1280): string[] {
  const frames: string[] = [];
  for (let off = 0; off < bytes.length; off += frameSize) {
    const chunk = bytes.subarray(off, Math.min(off + frameSize, bytes.length));
    let s = '';
    for (let i = 0; i < chunk.length; i++) s += String.fromCharCode(chunk[i]);
    frames.push(btoa(s));
  }
  return frames;
}

/** Loudest sample (0..1): below ~0.03 nothing useful was recorded. */
export function peakOf(pcm: Float32Array): number {
  let p = 0;
  for (let i = 0; i < pcm.length; i++) {
    const a = Math.abs(pcm[i]);
    if (a > p) p = a;
  }
  return p;
}

/** 讯飞 accepts at most 2000 frames (≈ 80 s). */
export const MAX_FRAMES = 2000;
