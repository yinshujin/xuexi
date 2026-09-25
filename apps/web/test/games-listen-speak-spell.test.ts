import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOOKS, type Book, type Unit } from '@xuexi/curriculum';
import { createRng, seedFrom, YW_G2A_WORDS, YW_G4A_WORDS } from '@xuexi/practice';
import { wordAudioKey } from '@xuexi/course-pack';
import { listenBuilder, listenInfo, soundsAlike } from '../src/lib/games/listen';
import { speakBuilder, speakInfo, SPEAK_MAX_WORDS } from '../src/lib/games/speak';
import { spellBuilder, spellInfo, SPELL_MAX_LETTERS } from '../src/lib/games/spell';
import { listenCorrect, spellCorrect, type GameBuilder, type GameContext, type ListenGame, type SpeakGame, type SpellGame } from '../src/lib/games';
import { EN_BANKS, variantOf } from '../src/lib/games/util';
import { unitPapers } from '../src/lib/exams';
import { loadWordAudio, resetWordAudio, wordAudioUrl } from '../src/lib/wordAudio';

const cases = BOOKS.flatMap((book) => book.units.flatMap((unit) => [0, 1, 2].map((paper) => ({ book, unit, paper }))));

function build(b: GameBuilder, book: Book, unit: Unit, paper: number) {
  const kps = new Map(unit.knowledgePoints.map((k) => [variantOf(k.id), k]));
  const seed = `exam-game|${unit.id}|${paper}|${b.id}`;
  const ctx: GameContext = { book, unit, paper, rng: createRng(seedFrom(seed)), seed, kpOf: (v) => kps.get(v) };
  return b.build(ctx);
}

const DICTATION = { 'yw-g2a': YW_G2A_WORDS, 'yw-g4a': YW_G4A_WORDS } as Record<string, Record<string, Array<{ w: string }>>>;
const dictWords = (bookId: string) => new Set(Object.values(DICTATION[bookId] ?? {}).flatMap((ws) => ws.map((d) => d.w)));

describe('听音选择 listen', () => {
  it('every candidate is well formed and has exactly one right option', () => {
    let en = 0;
    let zh = 0;
    for (const { book, unit, paper } of cases) {
      const got = build(listenBuilder, book, unit, paper);
      if (book.subject === 'math') expect(got).toEqual([]);
      for (const { kpId, game } of got) {
        const g = game as ListenGame;
        const where = `${unit.id} ${paper} ${g.say}`;
        expect(unit.knowledgePoints.some((k) => k.id === kpId), where).toBe(true);
        expect(g.kind).toBe('listen');
        expect(g.requires).toEqual(['audio']);
        expect(g.options.length, where).toBeGreaterThanOrEqual(3);
        expect(g.options.length, where).toBeLessThanOrEqual(4);
        expect(new Set(g.options).size, where).toBe(g.options.length);
        expect(g.answer).toBeGreaterThanOrEqual(0);
        expect(g.options.map((_, i) => listenCorrect(g, i)).filter(Boolean)).toHaveLength(1);
        expect(listenInfo.prompt(g).length).toBeGreaterThan(0);
        expect(listenInfo.answer(g)).toContain(g.say);
        const right = g.options[g.answer];
        if (g.lang === 'en') {
          en++;
          const bank = EN_BANKS[book.id].words;
          const w = bank.find((x) => x.en === g.say)!;
          expect(w, where).toBeTruthy();
          // The spoken word is from this unit.
          expect(variantOf(kpId)).toBe(w.kp);
          if (right === w.zh) {
            // Meaning: the other options are other words' meanings.
            for (const o of g.options) expect(bank.some((x) => x.zh === o), `${where} ${o}`).toBe(true);
          } else {
            expect(right).toBe(g.say);
            for (const o of g.options) if (o !== right) expect(o.toLowerCase(), where).not.toBe(g.say.toLowerCase());
          }
        } else {
          zh++;
          expect(book.subject).toBe('chinese');
          expect(right).toBe(g.say);
          expect(g.words).toEqual([g.say]);
          const real = dictWords(book.id);
          expect(real.has(g.say), where).toBe(true);
          // Wrong options: same length, one character differs, never a real word of the list.
          for (const o of g.options) {
            if (o === right) continue;
            expect(real.has(o), `${where} ${o}`).toBe(false);
            expect([...o].length).toBe([...right].length);
            expect([...o].filter((c, i) => c !== [...right][i]).length, `${where} ${o}`).toBe(1);
          }
        }
      }
    }
    expect(en).toBeGreaterThan(20);
    expect(zh).toBeGreaterThan(20);
  });

  it('never offers a homophone of the word heard', () => {
    expect(soundsAlike('aunt', 'ant')).toBe(true);
    expect(soundsAlike('Pear', 'pair')).toBe(true);
    expect(soundsAlike('cat', 'hat')).toBe(false);
    for (const { book, unit, paper } of cases.filter((c) => c.book.subject === 'english')) {
      for (const { game } of build(listenBuilder, book, unit, paper)) {
        const g = game as ListenGame;
        const bank = EN_BANKS[book.id].words;
        for (const o of g.options) {
          if (o === g.options[g.answer]) continue;
          const en = bank.find((x) => x.zh === o)?.en ?? o;
          expect(soundsAlike(en, g.say), `${unit.id} ${g.say} ${o}`).toBe(false);
        }
      }
    }
  });

  it('is deterministic, and every English and 语文 unit with words has one', () => {
    for (const { book, unit, paper } of cases) {
      expect(build(listenBuilder, book, unit, paper)).toEqual(build(listenBuilder, book, unit, paper));
      if (book.subject === 'english' && EN_BANKS[book.id].words.some((w) => unit.knowledgePoints.some((k) => variantOf(k.id) === w.kp))) {
        expect(build(listenBuilder, book, unit, paper).length, unit.id).toBeGreaterThan(0);
      }
    }
    const ywUnits = BOOKS.filter((b) => b.subject === 'chinese').flatMap((b) => b.units.map((u) => ({ b, u })));
    const withListen = ywUnits.filter(({ b, u }) => build(listenBuilder, b, u, 0).length > 0);
    expect(withListen.length / ywUnits.length).toBeGreaterThan(0.8);
  });
});

describe('开口读 speak', () => {
  it('English words and short sentences of the unit, needing 讯飞', () => {
    let n = 0;
    for (const { book, unit, paper } of cases) {
      const got = build(speakBuilder, book, unit, paper);
      if (book.subject !== 'english') expect(got).toEqual([]);
      for (const { kpId, game } of got) {
        const g = game as SpeakGame;
        n++;
        expect(unit.knowledgePoints.some((k) => k.id === kpId)).toBe(true);
        expect(g.requires).toEqual(['scoring']);
        expect(g.lang).toBe('en');
        expect(g.text).toMatch(/^[A-Za-z][A-Za-z' ,.?!-]*$/);
        expect(g.text.split(' ').length).toBeLessThanOrEqual(SPEAK_MAX_WORDS);
        expect(speakInfo.answer(g)).toContain(g.text);
        expect(speakInfo.prompt(g)).toContain(g.text);
      }
    }
    expect(n).toBeGreaterThan(20);
  });
});

describe('拼写 spell', () => {
  it('the word can be spelt from the tiles, and only it is right', () => {
    let n = 0;
    for (const { book, unit, paper } of cases) {
      const got = build(spellBuilder, book, unit, paper);
      if (book.subject !== 'english') expect(got).toEqual([]);
      for (const { kpId, game } of got) {
        const g = game as SpellGame;
        n++;
        const where = `${unit.id} ${paper} ${g.answer}`;
        expect(unit.knowledgePoints.some((k) => k.id === kpId)).toBe(true);
        expect(g.requires ?? []).toEqual([]);
        expect(g.answer).toMatch(new RegExp(`^[A-Za-z]{2,${SPELL_MAX_LETTERS}}$`));
        // The meaning names one word of the book.
        const bank = EN_BANKS[book.id].words;
        expect(bank.filter((w) => w.zh === g.zh).map((w) => w.en)).toEqual([g.answer]);
        for (const t of g.tiles) expect(t).toMatch(/^[a-z]$/);
        const pool = [...g.tiles];
        for (const c of g.answer.toLowerCase()) {
          const at = pool.indexOf(c);
          expect(at, where).toBeGreaterThanOrEqual(0);
          pool.splice(at, 1);
        }
        expect(pool.length, where).toBeGreaterThanOrEqual(2);
        for (const d of pool) expect(g.answer.toLowerCase().includes(d), where).toBe(false);
        expect(g.tiles.join('').startsWith(g.answer.toLowerCase()), where).toBe(false);
        expect(spellCorrect(g, g.answer)).toBe(true);
        expect(spellCorrect(g, g.answer.toUpperCase())).toBe(true);
        expect(spellCorrect(g, g.answer.slice(1))).toBe(false);
        expect(spellCorrect(g, pool[0] + g.answer.slice(1))).toBe(false);
        expect(spellInfo.answer(g)).toBe(g.answer);
        expect(spellInfo.prompt(g)).toContain(g.zh);
      }
    }
    expect(n).toBeGreaterThan(20);
  });
});

describe('in the papers', () => {
  it('English papers get 听音选择, 开口读 and 拼写; 语文 papers 听音选择', () => {
    for (const book of BOOKS.filter((b) => b.subject !== 'math')) {
      for (const u of book.units) {
        const kinds = new Set(unitPapers(u.id).flatMap((p) => p.items.flatMap((it) => (it.game ? [it.game.kind] : []))));
        if (unitPapers(u.id).length === 0) continue;
        if (book.subject === 'english') for (const k of ['listen', 'speak', 'spell']) expect(kinds.has(k), `${u.id} ${k}`).toBe(true);
      }
    }
    const yw = BOOKS.filter((b) => b.subject === 'chinese').flatMap((b) => b.units);
    expect(yw.filter((u) => unitPapers(u.id).some((p) => p.items.some((it) => it.game?.kind === 'listen'))).length).toBeGreaterThan(yw.length * 0.8);
  });
});

describe('word audio in the app', () => {
  afterEach(() => {
    resetWordAudio();
    vi.unstubAllGlobals();
  });

  it('finds a word\'s clip by language and text', () => {
    resetWordAudio({ words: { [wordAudioKey('en', 'see')]: 'en/abc.mp3', [wordAudioKey('zh', '海洋')]: 'zh/def.mp3' } });
    expect(wordAudioUrl('en', 'See ')).toMatch(/builtin\/word-audio\/en\/abc\.mp3$/);
    expect(wordAudioUrl('zh', '海洋')).toMatch(/builtin\/word-audio\/zh\/def\.mp3$/);
    expect(wordAudioUrl('en', 'sea')).toBeUndefined();
  });

  it('loads the built-in manifest, and says no when there is none (website)', async () => {
    const manifest = { format: 'xuexi-word-audio@1', builtAt: '', voices: {}, words: { 'en:see': 'en/a.mp3' }, files: {} };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json' } })));
    expect(await loadWordAudio()).toBe(true);
    expect(wordAudioUrl('en', 'see')).toBeTruthy();
    resetWordAudio();
    // The website: index.html comes back for unknown paths.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } })));
    expect(await loadWordAudio()).toBe(false);
    expect(wordAudioUrl('en', 'see')).toBeUndefined();
  });
});
