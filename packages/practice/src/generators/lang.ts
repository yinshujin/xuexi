import type { ErrorTag, GeneratorId } from '@xuexi/shared';
import { createRng, type Rng } from '../rng';
import type { SolutionStep } from '../types';
import type { BankLevel, ChineseBank, ChoiceItem, EnglishBank, EnWord, Polyphone } from '../banks/types';
import { BLANK, buildChoice, choiceDiagnosis, defineGenerator, step, type Draft, type PracticeGenerator } from './base';

/**
 * Generators for 语文 / 英语 built on item banks (see banks/types.ts).
 *
 * Every bank is expanded once into concrete question templates; a question
 * picks a template by (variant = knowledge point, target error tag, level
 * window for the difficulty) and shuffles the options with the seeded rng, so
 * it stays reproducible from (id, difficulty, seed, variant).
 *
 * Prompt formats are fixed (the tests re-derive answers from them):
 *   【<kind>】<item prompt>                               authored items
 *   【多音字】「调」在「调皮」里读（　）                         reading of a word
 *   【多音字】下面哪个词语里的「调」读 diào？                    word with a reading
 *   【多音字】<sentence with 「调」>\n句子里「调」的读音是（　）   reading in a sentence
 *   【多音字】「调皮」和「调查」里的「调」读音相同吗？             same reading?
 *   【词义】morning 的意思是（　）                            English → Chinese
 *   【说一说】“早上”用英语怎么说？                             Chinese → English
 *   【拼写】选出拼写正确的单词：早上                            spelling
 *   【拔高】【<kind>】… / 【创新】【<kind>】…                        tiered authored items
 */

export interface LangParams {
  template: string;
  optionTags: Array<ErrorTag | null>;
}

interface Template {
  id: string;
  kp: string;
  level: BankLevel;
  tier?: 'stretch' | 'creative';
  /** Tags a wrong option can carry (for targetFor). */
  tags: ErrorTag[];
  build(rng: Rng): Omit<Draft<LangParams>, 'params'> & { optionTags: Array<ErrorTag | null> };
}

const HINTS: Record<string, string> = {
  读音: '读一读，注意声调、平舌翘舌和前鼻音后鼻音。',
  看拼音选字: '先拼一拼读音，再想想这个词的意思，选对应的字。',
  形近字: '看看偏旁，想想字的意思和偏旁有什么关系。',
  同音字: '读音一样，意思不同，放回词语里想一想。',
  选词填空: '把每个词放进句子里读一读，哪个最通顺？',
  词义: '联系课文里的句子，想想这个词是什么意思。',
  量词: '想一想平时怎么说，“一（ ）东西”读起来顺不顺。',
  选句: '把每一句都读一读，看看哪一句最符合题目的要求。',
  病句: '一句一句读，找找有没有意思重复、缺少部分或搭配不当。',
  提问: '想一想，弄懂哪个问题最能帮你读懂故事或文章？',
  辨析: '一项一项对照课文想一想，找出和课文不一样的那一项。',
  修辞: '想一想这句话把什么比作什么，或把什么当作人来写，这样写好在哪里。',
  阅读: '先把短文读完，再回到文中找和问题有关的句子。',
  仿写: '看看例子是怎么写的，选和它写法最像、又最通顺的一句。',
  运用: '想一想课文里学到的方法或道理，放到这件事里该怎么用。',
  反义词: '意思正好相反的词，放在一起读一读：大—小，高—矮。',
  近义词: '意思差不多的词，换进句子里读一读，意思变没变？',
  课文理解: '回想课文里是怎么写的，再选。',
  词语搭配: '把词语连起来读一读，平时是这样说的吗？',
  偏旁: '想想偏旁的意思：带“犭”“虫”的字多和动物有关，带“木”的多和树木有关。',
  笔画: '按笔顺一笔一笔地书空，数一数。',
  字形: '看清楚字的每一部分，和形近字比一比。',
  口语交际: '想一想，这时候怎么说最有礼貌、最清楚？',
  动物知识: '想一想这种动物平时是什么样子的。',
  排序: '先找开头，再一句接一句地连起来读。',
  易混辨析: '把容易混的放进句子里，比一比意思有什么不同。',
  选出用错的一项: '一项一项放回句子里读，哪一项读起来不对？',
  推断: '从题目给的线索出发，想一想最可能是怎样的。',
  综合: '这道题要用到两个知识，一个一个想清楚。',
  短文阅读: '先把短文读完，再回到文中找答案。',
  生活运用: '想想学过的知识，用到生活里的这件事上。',
  分类: '先想想每一个属于哪一类，再找不一样的那个。',
  谜语: '抓住谜面里的每一个特点，一个一个对照。',
  根据意思选词: '先弄懂意思，再看哪个词正好是这个意思。',
  情景交际: 'Think: 这时候说哪一句最合适？读一读每个选项。',
  看中文选英文: '先想中文意思，再小声读一读每个英文句子。',
  补全对话: '读一读上下两句，中间应该怎么说才接得上？',
  选出正确的句子: '一个词一个词地看：大小写、am/is/are、单词拼写。',
  句子意思: '先认出句子里学过的单词，再想整句的意思。',
  连词成句: '先找句子开头（大写字母），问句的问号放最后。',
  配对词: '想一想课文里哪两个词总是一起出现。',
  找不同: '先想想每个词的意思，再找不同类的那一个。',
  补全单词: '小声拼一拼，想想这个单词怎么写。',
  句型选择: '想一想是问句还是回答，用学过的句型。',
  找错句: '一句一句读，看看哪一句的单词或句型用错了。',
  对话排序: '先找第一句（打招呼或提问），再一问一答接下去。',
  读一读: '读一读，想想每个单词的意思。',
  看图说话: '按题目说的画面想一想，哪句话说的正是这个？',
  猜一猜: '抓住每一个线索：它能做什么，不能做什么？',
  补全句子: '想一想 can 和 can\'t、and 和 but 该用哪一个。',
  字母发音: '小声读一读每个单词，听听那个字母是读短音，还是读字母本身的音（像 cake 里的 a）。',
  读算式: '看符号换单词：+ 读 plus，− 读 minus，= 读 equals。',
  // ---- 数学概念题（图形的运动、空间、统计）
  图形判断: '想象把它对折：两边能完全重合，才是轴对称图形；只是看起来差不多不算。',
  对称轴: '对折后两边完全重合，折痕所在的直线就是对称轴。横着、竖着、斜着都试着想一想。',
  剪一剪: '想象把纸展开：贴着折痕的地方连在一起，纸有几层，一刀就剪出几份。',
  平移旋转: '平移：沿直线移动，方向不变；旋转：绕着一个点或一根轴转动。',
  数格子: '盯住图形上的同一个点（比如左边），数它走了几步，不要只数中间空着的格子。',
  华容道: '棋子只能上下左右平移；盯住棋子的一条边，数它移动了几格。',
  观察: '视线是从眼睛出发的直线，被挡住的地方看不到；想一想离得近一些、站得高一些会怎样。',
  方向: '先找准观察点，再按「上北下南，左西右东」判断；两个地方互相看，方向正好相反。',
  切一切: '想象刀切下去的样子：切的方向不同，切面的形状也可能不同。',
  搭一搭: '从正面看每一列看最高的，从上面看每个位置算一个正方形；别漏了被挡住的小正方体。',
  翻一翻: '骰子相对两面的点数和是 7；向哪边翻，朝上的面就倒向哪边，另一边的面翻到上面。',
  展开图: '展开图的同一行里，中间隔一个的两个面相对；相对的两个面不会挨在一起。',
  读统计表: '先看清每一项表示什么、单位是什么，再找数、比大小、算一算。',
  统计图: '先看一格表示几，再数直条有几格，半格就是一格的一半。',
  数据整理: '看清每段从几到几，按顺序一个一个数，每个数据只数一次，最后检查总数。',
  数据分析: '用数据说话：比一比、算一算，还要想想实际情况，不能只看一次就下结论。',
  导航: '时间 = 路程 ÷ 速度；比较时间用大的减小的，想想堵车、红绿灯这些情况。',
};

function itemTemplate(item: ChoiceItem, i: number): Template {
  return {
    id: `item:${i}`,
    kp: item.kp,
    level: item.level,
    ...(item.tier ? { tier: item.tier } : {}),
    tags: [...new Set(item.wrong.map(([, t]) => t))],
    build(rng) {
      const c = buildChoice(
        rng,
        item.answer,
        item.wrong.map(([text, tag]) => ({ text, tag })),
      );
      return {
        widget: 'choice',
        prompt: `${item.tier === 'stretch' ? '【拔高】' : item.tier === 'creative' ? '【创新】' : ''}【${item.kind}】${item.prompt}`,
        options: c.options,
        answer: { type: 'choice', index: c.index },
        hint: HINTS[item.kind] ?? '读一读题目，想一想课文里学过的内容。',
        steps: [step(`答案是「${item.answer}」。`), step(item.explain)],
        targetSeconds: 20,
        optionTags: c.optionTags,
      };
    },
  };
}

function readingSteps(p: Polyphone, conclusion: string): SolutionStep[] {
  return [
    ...p.readings.map((r) => step(`${p.char} ${r.pinyin}：${r.meaning}，如 ${r.words.join('、')}`)),
    step(conclusion),
  ];
}

const POLY_HINT = '先想一想这个词语的意思，意思不同，读音就不同。';

function polyTemplates(p: Polyphone, pi: number): Template[] {
  const out: Template[] = [];
  const readingOf = (word: string) => p.readings.find((r) => r.words.includes(word))!;
  const pinyins = p.readings.map((r) => r.pinyin);
  // 1. reading of a word
  for (const r of p.readings) {
    for (const word of r.words) {
      out.push({
        id: `poly:${pi}:w:${word}`,
        kp: p.kp,
        level: 1,
        tags: ['polyphone'],
        build(rng) {
          const c = buildChoice(
            rng,
            r.pinyin,
            pinyins.filter((x) => x !== r.pinyin).map((text) => ({ text, tag: 'polyphone' as const })),
          );
          return {
            widget: 'choice',
            prompt: `【多音字】「${p.char}」在「${word}」里读${BLANK}`,
            options: c.options,
            answer: { type: 'choice', index: c.index },
            hint: POLY_HINT,
            steps: readingSteps(p, `「${word}」的意思是${r.meaning}，所以读 ${r.pinyin}。`),
            targetSeconds: 15,
            optionTags: c.optionTags,
          };
        },
      });
    }
  }
  // 2. which word has this reading (needs words in at least one other reading)
  for (const r of p.readings) {
    const others = p.readings.filter((o) => o !== r).flatMap((o) => o.words);
    if (others.length === 0) continue;
    out.push({
      id: `poly:${pi}:r:${r.pinyin}`,
      kp: p.kp,
      level: 2,
      tags: ['polyphone'],
      build(rng) {
        const right = rng.pick(r.words);
        const wrong = rng.shuffle(others).slice(0, 2);
        const c = buildChoice(
          rng,
          right,
          wrong.map((text) => ({ text, tag: 'polyphone' as const })),
        );
        return {
          widget: 'choice',
          prompt: `【多音字】下面哪个词语里的「${p.char}」读 ${r.pinyin}？`,
          options: c.options,
          answer: { type: 'choice', index: c.index },
          hint: POLY_HINT,
          steps: readingSteps(
            p,
            `「${right}」里的「${p.char}」读 ${r.pinyin}；` +
              wrong.map((w) => `「${w}」里读 ${readingOf(w).pinyin}`).join('，') +
              '。',
          ),
          targetSeconds: 20,
          optionTags: c.optionTags,
        };
      },
    });
  }
  // 3. reading in a sentence
  (p.sentences ?? []).forEach((s, si) => {
    const r = p.readings.find((x) => x.pinyin === s.pinyin)!;
    out.push({
      id: `poly:${pi}:s:${si}`,
      kp: p.kp,
      level: 2,
      tags: ['polyphone'],
      build(rng) {
        const c = buildChoice(
          rng,
          s.pinyin,
          pinyins.filter((x) => x !== s.pinyin).map((text) => ({ text, tag: 'polyphone' as const })),
        );
        return {
          widget: 'choice',
          prompt: `【多音字】${s.text}\n句子里「${p.char}」的读音是${BLANK}`,
          options: c.options,
          answer: { type: 'choice', index: c.index },
          hint: '把这个字组成词，想一想在句子里是什么意思。',
          steps: readingSteps(p, `在这句话里「${p.char}」表示${r.meaning}，读 ${s.pinyin}。`),
          targetSeconds: 20,
          optionTags: c.optionTags,
        };
      },
    });
  });
  // 4. same reading in two words? (a pair from the same reading and a pair across readings)
  const all = p.readings.flatMap((r) => r.words);
  if (all.length >= 3 && p.readings.length >= 2) {
    out.push({
      id: `poly:${pi}:same`,
      kp: p.kp,
      level: 3,
      tags: ['polyphone'],
      build(rng) {
        const sameReading = rng.chance(0.5);
        const pool = p.readings.filter((r) => r.words.length >= 2);
        let a: string;
        let b: string;
        if (sameReading && pool.length > 0) {
          const r = rng.pick(pool);
          [a, b] = rng.shuffle(r.words).slice(0, 2);
        } else {
          const [r1, r2] = rng.shuffle(p.readings).slice(0, 2);
          a = rng.pick(r1.words);
          b = rng.pick(r2.words);
        }
        const same = readingOf(a).pinyin === readingOf(b).pinyin;
        return {
          widget: 'choice',
          prompt: `【多音字】「${a}」和「${b}」里的「${p.char}」读音相同吗？`,
          options: ['相同', '不同'],
          answer: { type: 'choice', index: same ? 0 : 1 },
          hint: POLY_HINT,
          steps: readingSteps(
            p,
            `「${a}」里读 ${readingOf(a).pinyin}，「${b}」里读 ${readingOf(b).pinyin}，读音${same ? '相同' : '不同'}。`,
          ),
          targetSeconds: 20,
          optionTags: same ? [null, 'polyphone'] : ['polyphone', null],
        };
      },
    });
  }
  return out;
}

// ------------------------------------------------------------------ English

/**
 * Fallback misspellings of one word when the bank gives none: swap two inner
 * letters, double a consonant, or (long words) drop an inner letter. No vowel
 * changes, which too easily make real words (big → bag). Banks should list
 * typical misspellings in `misspell` instead.
 */
export function misspellings(word: string, rng: Rng): string[] {
  const out = new Set<string>();
  const w = word;
  if (w.length < 4) return [];
  const inner = (i: number) => i > 0 && i < w.length - 1 && /[a-z]/.test(w[i]);
  for (let tries = 0; tries < 80 && out.size < 3; tries++) {
    const kind = rng.int(0, 2);
    const i = rng.int(1, w.length - 2);
    let x = w;
    if (kind === 0 && inner(i) && inner(i + 1) && w[i] !== w[i + 1]) x = w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    else if (kind === 1 && inner(i) && !'aeiou'.includes(w[i])) x = w.slice(0, i) + w[i] + w.slice(i);
    else if (kind === 2 && w.length >= 5 && inner(i)) x = w.slice(0, i) + w.slice(i + 1);
    if (x !== w) out.add(x);
  }
  return [...out];
}

/** Misspell the longest word of a phrase. */
function misspellPhrase(en: string, rng: Rng): string[] {
  const parts = en.split(' ');
  const k = parts.reduce((best, p, i) => (p.length > parts[best].length ? i : best), 0);
  return misspellings(parts[k], rng).map((m) => parts.map((p, i) => (i === k ? m : p)).join(' '));
}

function englishTemplates(words: EnWord[]): Template[] {
  const out: Template[] = [];
  words.forEach((w, wi) => {
    const others = words.filter((o) => o !== w);
    const sameKp = others.filter((o) => o.kp === w.kp);
    const pickOthers = (rng: Rng, n: number) => {
      const near = rng.shuffle(sameKp);
      const far = rng.shuffle(others.filter((o) => o.kp !== w.kp));
      return [...near, ...far].slice(0, n);
    };
    out.push({
      id: `en:${wi}:en2zh`,
      kp: w.kp,
      level: w.level,
      tags: ['en-meaning'],
      build(rng) {
        const c = buildChoice(
          rng,
          w.zh,
          pickOthers(rng, 3).map((o) => ({ text: o.zh, tag: 'en-meaning' as const })),
        );
        return {
          widget: 'choice',
          prompt: `【词义】${w.en} 的意思是${BLANK}`,
          options: c.options,
          answer: { type: 'choice', index: c.index },
          hint: '想一想课文里什么时候说这个词，配着动作记。',
          steps: [step(`${w.en} —— ${w.zh}`)],
          targetSeconds: 12,
          optionTags: c.optionTags,
        };
      },
    });
    out.push({
      id: `en:${wi}:zh2en`,
      kp: w.kp,
      level: Math.min(3, w.level + 1) as BankLevel,
      tags: ['en-meaning'],
      build(rng) {
        const c = buildChoice(
          rng,
          w.en,
          pickOthers(rng, 3).map((o) => ({ text: o.en, tag: 'en-meaning' as const })),
        );
        return {
          widget: 'choice',
          prompt: `【说一说】“${w.zh}”用英语怎么说？`,
          options: c.options,
          answer: { type: 'choice', index: c.index },
          hint: '小声读一读每个选项，哪个是这个意思？',
          steps: [step(`“${w.zh}”用英语说 ${w.en}。`)],
          targetSeconds: 12,
          optionTags: c.optionTags,
        };
      },
    });
    // Fixed per word (not per question), so the template only exists when it has enough options.
    const real = new Set(words.map((o) => o.en.toLowerCase()));
    const wrongSpellings = (
      w.misspell && w.misspell.length >= 2 ? w.misspell : misspellPhrase(w.en, createRng(`spell:${w.en}`))
    ).filter((m) => !real.has(m.toLowerCase()) && m !== w.en);
    if (wrongSpellings.length >= 2) {
      out.push({
        id: `en:${wi}:spell`,
        kp: w.kp,
        level: Math.max(2, w.level) as BankLevel,
        tags: ['en-spelling'],
        build(rng) {
          const c = buildChoice(
            rng,
            w.en,
            rng.shuffle(wrongSpellings).slice(0, 3).map((text) => ({ text, tag: 'en-spelling' as const })),
          );
          return {
            widget: 'choice',
            prompt: `【拼写】选出拼写正确的单词：${w.zh}`,
            options: c.options,
            answer: { type: 'choice', index: c.index },
            hint: '一个字母一个字母地拼一拼。',
            steps: [step(`“${w.zh}”拼作 ${w.en}：${w.en.replace(/ /g, '␣').split('').join(' ').replace(/␣/g, '  ')}`)],
            targetSeconds: 20,
            optionTags: c.optionTags,
          };
        },
      });
    }
  });
  return out;
}

// ------------------------------------------------------------------ factory

function levelWindow(difficulty: number): [number, number] {
  const max = difficulty <= 2 ? 1 : difficulty === 3 ? 2 : 3;
  const min = difficulty >= 5 ? 3 : difficulty === 4 ? 2 : 1;
  return [min, max];
}

function bankGenerator(id: GeneratorId, templates: Template[]): PracticeGenerator<LangParams> {
  if (templates.length === 0) throw new Error(`${id}: empty bank`);
  const core = templates.filter((t) => !t.tier);
  const kps = [...new Set(core.map((t) => t.kp))];
  // `${kp}#stretch` / `${kp}#creative`: 拔高 / 创新 items of a knowledge point.
  const tiered = [...new Set(templates.filter((t) => t.tier).map((t) => `${t.kp}#${t.tier}`))];
  const targets = [...new Set(templates.flatMap((t) => t.tags))];
  // Candidate lists depend only on (variant, target, difficulty); banks have
  // well over a thousand templates, so compute each list once.
  const candidates = new Map<string, Template[]>();
  function candidatesFor(variant: string, target: ErrorTag | undefined, difficulty: number): Template[] {
    const key = `${variant}|${target ?? ''}|${difficulty}`;
    const cached = candidates.get(key);
    if (cached) return cached;
    let list: Template[];
    if (variant.includes('#')) {
      const [kp, tier] = variant.split('#');
      list = templates.filter((x) => x.kp === kp && x.tier === tier);
    } else {
      const byKp = variant === 'mixed' ? core : core.filter((t) => t.kp === variant);
      let pool = byKp.length > 0 ? byKp : core;
      if (target) {
        const tagged = pool.filter((t) => t.tags.includes(target));
        pool = tagged.length > 0 ? tagged : core.filter((t) => t.tags.includes(target));
      }
      const [min, max] = levelWindow(difficulty);
      const inWindow = pool.filter((t) => t.level >= min && t.level <= max);
      const upTo = pool.filter((t) => t.level <= max);
      list = inWindow.length > 0 ? inWindow : upTo.length > 0 ? upTo : pool.length > 0 ? pool : templates;
    }
    candidates.set(key, list);
    return list;
  }
  return defineGenerator<LangParams>({
    id,
    variants: ['mixed', ...kps, ...tiered],
    targets,
    build({ difficulty, variant, target, rng }) {
      const chosen = rng.pick(candidatesFor(variant, target, difficulty));
      const { optionTags, ...draft } = chosen.build(rng);
      return { ...draft, params: { template: chosen.id, optionTags } };
    },
    diagnose(p, r) {
      return choiceDiagnosis(p.optionTags, r);
    },
  });
}

export function chineseWordsGenerator(id: GeneratorId, bank: ChineseBank): PracticeGenerator<LangParams> {
  return bankGenerator(id, [...bank.items.map(itemTemplate), ...bank.polyphones.flatMap(polyTemplates)]);
}

export function polyphoneGenerator(id: GeneratorId, polyphones: Polyphone[]): PracticeGenerator<LangParams> {
  return bankGenerator(id, polyphones.flatMap(polyTemplates));
}

export function englishGenerator(id: GeneratorId, bank: EnglishBank): PracticeGenerator<LangParams> {
  return bankGenerator(id, [...englishTemplates(bank.words), ...bank.items.map(itemTemplate)]);
}
