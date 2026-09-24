import katex from 'katex';
import type { PackLesson, PackScene } from '@xuexi/course-pack';
import { AUTHORED_FORMAT, type AuthoredLesson, type Block, type BlockColor, type BoardItem, type Step } from './format';
import { checkArithmetic } from './mathcheck';

export interface CompileResult {
  lesson: PackLesson | null;
  errors: string[];
  warnings: string[];
}

const THEME = {
  backgroundColor: '#ffffff',
  themeColors: ['#5b9bd5', '#ed7d31', '#70ad47', '#8e7cc3', '#a5a5a5'],
  fontColor: '#333333',
  fontName: 'Microsoft YaHei',
};

const COLORS: Record<BlockColor, string> = {
  blue: '#5b9bd5',
  orange: '#ed7d31',
  green: '#4caf73',
  purple: '#8e7cc3',
  gray: '#8a94a6',
};

const RECT = 'M 0 0 L 1000 0 L 1000 1000 L 0 1000 Z';
const SLIDE_W = 1000;
const SLIDE_H = 562;
const MARGIN = 60;
const ID_RE = /^[a-z0-9-]{1,40}$/;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Rough line count for Chinese text at a given font size and box width. */
function lines(text: string, fontSize: number, width: number): number {
  const perLine = Math.max(1, Math.floor(width / fontSize));
  return Math.max(1, Math.ceil([...text].length / perLine));
}

function textEl(id: string, html: string, left: number, top: number, width: number, height: number) {
  return {
    type: 'text',
    id,
    content: html,
    left,
    top,
    width,
    height,
    rotate: 0,
    defaultFontName: 'Microsoft YaHei',
    defaultColor: '#333333',
  };
}

interface Layout {
  elements: Record<string, unknown>[];
  ids: Set<string>;
  overflow: boolean;
}

function layoutBlocks(blocks: Block[], where: string, errors: string[], warnings: string[]): Layout {
  const elements: Record<string, unknown>[] = [];
  const ids = new Set<string>();
  const width = SLIDE_W - MARGIN * 2;
  let y = 36;
  const claim = (id: string) => {
    if (!ID_RE.test(id)) errors.push(`${where}: id "${id}" 只能用小写字母、数字和 -`);
    if (ids.has(id)) errors.push(`${where}: id "${id}" 重复`);
    ids.add(id);
  };

  blocks.forEach((b, i) => {
    const at = `${where}.blocks[${i}]`;
    if (!b || typeof b !== 'object' || typeof (b as { id?: unknown }).id !== 'string') {
      errors.push(`${at}: 缺少 id`);
      return;
    }
    claim(b.id);
    switch (b.kind) {
      case 'heading': {
        if (i !== 0) warnings.push(`${at}: heading 最好放在第一块`);
        elements.push(textEl(b.id, `<p style="font-size:34px;"><strong>${esc(b.text)}</strong></p>`, MARGIN, y, width, 64));
        y += 64 + 20;
        break;
      }
      case 'text': {
        if ([...b.text].length > 60) warnings.push(`${at}: 文字较长（${[...b.text].length} 字），孩子不容易读完`);
        const h = lines(b.text, 26, width) * 40 + 10;
        elements.push(textEl(b.id, `<p style="font-size:26px;">${esc(b.text)}</p>`, MARGIN, y, width, h));
        y += h + 16;
        break;
      }
      case 'bullets': {
        if (!Array.isArray(b.items) || b.items.length === 0) errors.push(`${at}: bullets.items 为空`);
        const items = b.items ?? [];
        if (items.length > 5) warnings.push(`${at}: 要点超过 5 条`);
        const h = items.reduce((n, t) => n + lines(`• ${t}`, 26, width) * 42, 0) + 10;
        const html = items.map((t) => `<p style="font-size:26px;">• ${esc(t)}</p>`).join('');
        elements.push(textEl(b.id, html, MARGIN, y, width, h));
        y += h + 16;
        break;
      }
      case 'cards': {
        const items = Array.isArray(b.items) ? b.items : [];
        if (items.length < 1 || items.length > 4) errors.push(`${at}: cards 需要 1–4 张卡片`);
        const gap = 40;
        const cardW = Math.min(280, (width - gap * (items.length - 1)) / Math.max(1, items.length));
        const total = cardW * items.length + gap * (items.length - 1);
        let x = MARGIN + (width - total) / 2;
        items.forEach((c, k) => {
          if (typeof c?.id !== 'string') {
            errors.push(`${at}.items[${k}]: 缺少 id`);
            return;
          }
          claim(c.id);
          elements.push({
            type: 'shape',
            id: c.id,
            left: Math.round(x),
            top: y,
            width: Math.round(cardW),
            height: 96,
            rotate: 0,
            viewBox: [1000, 1000],
            path: RECT,
            fill: COLORS[c.color ?? 'blue'] ?? COLORS.blue,
            fixedRatio: false,
            text: {
              content: `<p style="text-align:center;font-size:24px;">${esc(c.text)}</p>`,
              defaultFontName: 'Microsoft YaHei',
              defaultColor: '#ffffff',
              align: 'middle',
            },
          });
          x += cardW + gap;
        });
        y += 96 + 24;
        break;
      }
      case 'formula': {
        elements.push({
          type: 'latex',
          id: b.id,
          left: MARGIN,
          top: y,
          width: Math.min(width, 600),
          height: 72,
          rotate: 0,
          latex: b.latex,
          html: katex.renderToString(`\\LARGE ${String(b.latex ?? '')}`, { throwOnError: false, displayMode: true, output: 'html' }),
          color: '#1f2937',
          fixedRatio: true,
        });
        y += 72 + 20;
        break;
      }
      case 'table': {
        const rows = Array.isArray(b.rows) ? b.rows : [];
        const cols = rows[0]?.length ?? 0;
        if (rows.length === 0 || cols === 0) {
          errors.push(`${at}: table.rows 为空`);
          break;
        }
        const h = rows.length * 44;
        let cell = 0;
        elements.push({
          type: 'table',
          id: b.id,
          left: MARGIN,
          top: y,
          width,
          height: h,
          rotate: 0,
          colWidths: Array(cols).fill(1 / cols),
          cellMinHeight: 40,
          data: rows.map((r) => r.map((text) => ({ id: `${b.id}-c${cell++}`, colspan: 1, rowspan: 1, text: String(text) }))),
          outline: { width: 2, style: 'solid', color: '#cbd5e1' },
          theme: { color: '#5b9bd5', rowHeader: true, rowFooter: false, colHeader: false, colFooter: false },
        });
        y += h + 20;
        break;
      }
      default:
        errors.push(`${at}: 未知的 kind "${(b as { kind?: string }).kind}"`);
    }
  });
  return { elements, ids, overflow: y > SLIDE_H - 10 };
}

/** Convert whiteboard items to wb_* actions, auto-clearing when the board is full. */
function boardActions(
  items: BoardItem[],
  state: { y: number; open: boolean; n: number },
  prefix: string,
  where: string,
  errors: string[],
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const id = () => `${prefix}-wb${++state.n}`;
  if (!state.open) {
    out.push({ id: id(), type: 'wb_open' });
    state.open = true;
  }
  items.forEach((item, k) => {
    const height = 'table' in item ? item.table.length * 44 : 'line' in item ? 20 : 64;
    if (state.y + height > SLIDE_H - 20) {
      out.push({ id: id(), type: 'wb_clear' });
      state.y = 40;
    }
    if ('text' in item) {
      out.push({ id: id(), type: 'wb_draw_text', content: item.text, x: 80, y: state.y, width: 840, height: 60, fontSize: 32 });
    } else if ('latex' in item) {
      out.push({ id: id(), type: 'wb_draw_latex', latex: item.latex, x: 80, y: state.y, width: 600, height: 64 });
    } else if ('line' in item) {
      out.push({ id: id(), type: 'wb_draw_line', startX: 80, startY: state.y + 10, endX: 640, endY: state.y + 10, width: 3, color: '#333333' });
    } else if ('table' in item) {
      const cols = item.table[0]?.length ?? 0;
      out.push({ id: id(), type: 'wb_draw_table', data: item.table, x: 80, y: state.y, width: Math.min(840, cols * 140), height });
    } else {
      errors.push(`${where}.board[${k}]: 未知的白板内容`);
      return;
    }
    state.y += height + 12;
  });
  return out;
}

function collectTexts(lesson: AuthoredLesson): string[] {
  const texts: string[] = [];
  for (const s of lesson.scenes ?? []) {
    if (s.type === 'slide') {
      for (const b of s.blocks ?? []) {
        if (b.kind === 'heading' || b.kind === 'text') texts.push(b.text);
        if (b.kind === 'bullets') texts.push(...(b.items ?? []));
        if (b.kind === 'cards') texts.push(...(b.items ?? []).map((c) => c.text));
        if (b.kind === 'table') texts.push(...(b.rows ?? []).flat());
      }
      for (const st of s.script ?? []) {
        if ('say' in st) texts.push(st.say);
        if ('board' in st) for (const it of st.board ?? []) if ('text' in it) texts.push(it.text);
      }
    } else if (s.type === 'quiz') {
      if (s.intro) texts.push(s.intro);
      for (const q of s.questions ?? []) texts.push(q.analysis ?? '');
    }
  }
  return texts;
}

export function compileAuthored(input: unknown, expectLessonId: string): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const a = input as AuthoredLesson;
  if (!a || typeof a !== 'object') return { lesson: null, errors: ['不是 JSON 对象'], warnings };
  if (a.format !== AUTHORED_FORMAT) errors.push(`format 必须是 "${AUTHORED_FORMAT}"`);
  if (a.lessonId !== expectLessonId) errors.push(`lessonId 应为 "${expectLessonId}"，实际是 "${a.lessonId}"`);
  if (typeof a.title !== 'string' || !a.title) errors.push('缺少 title');
  if (!Array.isArray(a.scenes) || a.scenes.length === 0) {
    errors.push('scenes 为空');
    return { lesson: null, errors, warnings };
  }

  for (const t of collectTexts(a)) {
    for (const issue of checkArithmetic(t)) {
      errors.push(`算式有误：「${issue.expression}」，正确结果应为 ${issue.expected}`);
    }
  }

  const stageId = expectLessonId;
  const scenes: PackScene[] = [];
  const board = { y: 40, open: false, n: 0 };
  let sayCount = 0;

  a.scenes.forEach((s, si) => {
    const where = `scenes[${si}]`;
    const sceneId = `${stageId}-s${si}`;
    const base = { id: sceneId, stageId, title: String(s?.title ?? `第 ${si + 1} 页`), order: si };
    if (s?.type === 'slide') {
      const { elements, ids, overflow } = layoutBlocks(s.blocks ?? [], where, errors, warnings);
      if (overflow) warnings.push(`${where}（${base.title}）：内容太多，可能超出页面，建议拆成两页`);
      const actions: Record<string, unknown>[] = [];
      let says = 0;
      (s.script ?? []).forEach((st: Step, k) => {
        const at = `${where}.script[${k}]`;
        const aid = `${sceneId}-a${k}`;
        if ('say' in st) {
          if (typeof st.say !== 'string' || !st.say.trim()) errors.push(`${at}: say 为空`);
          if (st.lang !== undefined && st.lang !== 'en') errors.push(`${at}: lang 只能是 "en"`);
          if (st.lang === 'en' && /[\u4e00-\u9fff]/.test(st.say ?? '')) {
            errors.push(`${at}: 英文朗读（lang "en"）里有中文，请把中文讲解拆成单独的 say`);
          }
          actions.push({ id: aid, type: 'speech', text: st.say, ...(st.lang === 'en' ? { lang: 'en' } : {}) });
          says++;
        } else if ('spotlight' in st) {
          if (!ids.has(st.spotlight)) errors.push(`${at}: spotlight 指向不存在的 id "${st.spotlight}"`);
          actions.push({ id: aid, type: 'spotlight', elementId: st.spotlight });
        } else if ('laser' in st) {
          if (!ids.has(st.laser)) errors.push(`${at}: laser 指向不存在的 id "${st.laser}"`);
          actions.push({ id: aid, type: 'laser', elementId: st.laser });
        } else if ('board' in st) {
          if (!Array.isArray(st.board) || st.board.length === 0) errors.push(`${at}: board 为空`);
          actions.push(...boardActions(st.board ?? [], board, sceneId, at, errors));
        } else if ('boardClear' in st) {
          actions.push({ id: aid, type: 'wb_clear' });
          board.y = 40;
        } else if ('boardClose' in st) {
          actions.push({ id: aid, type: 'wb_close' });
          board.open = false;
        } else {
          errors.push(`${at}: 未知的步骤 ${JSON.stringify(st).slice(0, 60)}`);
        }
      });
      if (says < 2) warnings.push(`${where}（${base.title}）：讲解少于 2 句`);
      sayCount += says;
      scenes.push({
        ...base,
        type: 'slide',
        content: {
          type: 'slide',
          canvas: {
            id: `${sceneId}-canvas`,
            viewportSize: SLIDE_W,
            viewportRatio: 0.5625,
            theme: THEME,
            background: { type: 'solid', color: '#f7fbff' },
            elements,
          },
        },
        actions,
      } as unknown as PackScene);
    } else if (s?.type === 'quiz') {
      const qs = s.questions ?? [];
      if (qs.length === 0) errors.push(`${where}: quiz 没有题目`);
      const questions = qs.map((q, qi) => {
        const at = `${where}.questions[${qi}]`;
        const opts = Array.isArray(q.options) ? q.options : [];
        if (opts.length < 2) errors.push(`${at}: 至少 2 个选项`);
        const ans = Array.isArray(q.answer) ? q.answer : [];
        if (ans.length === 0 || ans.some((x) => !Number.isInteger(x) || x < 0 || x >= opts.length)) {
          errors.push(`${at}: answer 序号无效`);
        }
        const letter = (x: number) => String.fromCharCode(65 + x);
        return {
          id: `${sceneId}-q${qi}`,
          type: ans.length > 1 ? 'multiple' : 'single',
          question: q.question,
          options: opts.map((label, x) => ({ label, value: letter(x) })),
          answer: ans.map(letter),
          analysis: q.analysis,
          hasAnswer: true,
          points: 1,
        };
      });
      const actions = s.intro ? [{ id: `${sceneId}-a0`, type: 'speech', text: s.intro }] : [];
      sayCount += actions.length;
      scenes.push({ ...base, type: 'quiz', content: { type: 'quiz', questions }, actions } as unknown as PackScene);
    } else {
      errors.push(`${where}: type 必须是 slide 或 quiz`);
    }
  });

  if (sayCount < 5) warnings.push('整节课讲解很少（少于 5 句）');
  if (errors.length) return { lesson: null, errors, warnings };
  const now = Date.now();
  return {
    lesson: {
      stage: { id: stageId, name: a.title, createdAt: now, updatedAt: now, languageDirective: 'zh-CN' },
      scenes,
    },
    errors,
    warnings,
  };
}
