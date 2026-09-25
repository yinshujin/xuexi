import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { readWordAudioPack, WORD_AUDIO_MANIFEST, wordAudioKey, type WordAudioManifest } from '@xuexi/course-pack';
import { EN_G2A, EN_G4A, YW_G2A_WORDS, YW_G4A_WORDS } from '@xuexi/practice';
import { writeBuiltin } from '../src/builtin';
import type { BookVoice } from '../src/books/tts';
import { buildWordAudioPack, wordAudioTexts } from '../src/word-audio';

/** Writes "<voice>:<text>" as the clip: no network needed (edge-tts runs on CI). */
function fakeVoice(name: string, calls: string[]): BookVoice {
  return {
    name,
    ext: 'mp3',
    cacheKey: `fake:${name}`,
    async synthesize(jobs) {
      for (const j of jobs) {
        calls.push(j.text);
        writeFileSync(j.audio, `${name}:${j.text}`);
        writeFileSync(j.words, '[]');
      }
    },
  };
}

describe('word audio pack', () => {
  let tmp: string;
  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xuexi-word-audio-'));
  });
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it('lists every English bank word and every 听写 word once', () => {
    const texts = wordAudioTexts();
    const keys = texts.map((t) => wordAudioKey(t.lang, t.text));
    expect(new Set(keys).size).toBe(keys.length);
    for (const w of [...EN_G2A.words, ...EN_G4A.words]) expect(keys, w.en).toContain(wordAudioKey('en', w.en));
    for (const list of [YW_G2A_WORDS, YW_G4A_WORDS]) {
      for (const d of Object.values(list).flat()) expect(keys, d.w).toContain(wordAudioKey('zh', d.w));
    }
    expect(texts.filter((t) => t.lang === 'en').length).toBeGreaterThan(100);
    expect(texts.filter((t) => t.lang === 'zh').length).toBeGreaterThan(200);
  });

  it('builds a zip with a manifest, reuses the cache and unpacks into the app', async () => {
    const calls: string[] = [];
    const voices = { en: fakeVoice('en', calls), zh: fakeVoice('zh', calls) };
    const cacheDir = join(tmp, 'cache');
    const out = join(tmp, 'xuexi-word-audio.zip');
    const r = await buildWordAudioPack({ voices, cacheDir, out });
    const all = wordAudioTexts();
    expect(r.words).toBe(all.length);
    expect(r.synthesized).toBe(all.length);
    expect(calls.length).toBe(all.length);

    const zip = unzipSync(new Uint8Array(readFileSync(out)));
    const manifest = JSON.parse(new TextDecoder().decode(zip[WORD_AUDIO_MANIFEST])) as WordAudioManifest;
    expect(manifest.format).toBe('xuexi-word-audio@1');
    expect(Object.keys(manifest.words).length).toBe(all.length);
    const see = manifest.words[wordAudioKey('en', 'see')];
    expect(see).toMatch(/^en\/[0-9a-f]{16}\.mp3$/);
    expect(new TextDecoder().decode(zip[see])).toBe('en:see');
    const zhWord = YW_G2A_WORDS['u1.tadpole'][0].w;
    expect(new TextDecoder().decode(zip[manifest.words[wordAudioKey('zh', zhWord)]])).toBe(`zh:${zhWord}`);

    // Second run: everything from the cache.
    const again = await buildWordAudioPack({ voices, cacheDir, out: join(tmp, 'again.zip') });
    expect(again.synthesized).toBe(0);
    expect(calls.length).toBe(all.length);

    // `pnpm content builtin` puts it under builtin/word-audio/.
    const dir = join(tmp, 'builtin');
    const b = await writeBuiltin([out], dir);
    expect(b.wordAudio).toBe(all.length);
    expect(b.skipped).toEqual([]);
    const m2 = JSON.parse(readFileSync(join(dir, 'word-audio', WORD_AUDIO_MANIFEST), 'utf8')) as WordAudioManifest;
    expect(readFileSync(join(dir, 'word-audio', m2.words[wordAudioKey('en', 'SEE ')]), 'utf8')).toBe('en:see');
    expect(JSON.parse(readFileSync(join(dir, 'books.json'), 'utf8'))).toEqual([]);
  });

  it('drops a tampered clip and rejects a foreign zip', async () => {
    const voices = { en: fakeVoice('en', []), zh: fakeVoice('zh', []) };
    const out = join(tmp, 'small.zip');
    await buildWordAudioPack({
      voices,
      cacheDir: join(tmp, 'cache2'),
      out,
      texts: [
        { lang: 'en', text: 'cat' },
        { lang: 'zh', text: '海洋' },
      ],
    });
    const zip = unzipSync(new Uint8Array(readFileSync(out)));
    const m = JSON.parse(new TextDecoder().decode(zip[WORD_AUDIO_MANIFEST])) as WordAudioManifest;
    zip[m.words[wordAudioKey('en', 'cat')]] = new TextEncoder().encode('evil');
    const r = await readWordAudioPack(zip);
    expect(Object.keys(r.manifest.words)).toEqual([wordAudioKey('zh', '海洋')]);
    expect(r.skipped).toHaveLength(1);

    const bad = { ...zip, [WORD_AUDIO_MANIFEST]: new TextEncoder().encode(JSON.stringify({ ...m, format: 'x' })) };
    await expect(readWordAudioPack(bad)).rejects.toThrow(/格式/);
    writeFileSync(join(tmp, 'bad.zip'), zipSync(bad));
    await expect(writeBuiltin([join(tmp, 'bad.zip')], join(tmp, 'b2'))).rejects.toThrow(/格式/);
  });
});
