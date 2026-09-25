import { describe, expect, it } from 'vitest';
import { ERROR_TAGS } from '@xuexi/shared';
import { MAX_REQUIREMENT_LENGTH } from '../src/prompt';
import {
  allLessons,
  buildGenerationRequirement,
  findLesson,
  lessonTemplateVersion,
} from '../src/index';

describe('buildGenerationRequirement', () => {
  it('exports a template version', () => {
    expect(typeof lessonTemplateVersion).toBe('string');
    expect(lessonTemplateVersion.length).toBeGreaterThan(0);
  });

  it('includes the essentials and stays under the length limit for every lesson', () => {
    let longest = 0;
    for (const ctx of allLessons()) {
      const text = buildGenerationRequirement(ctx);
      const len = [...text].length;
      longest = Math.max(longest, len);
      expect(len, ctx.lesson.id).toBeLessThanOrEqual(MAX_REQUIREMENT_LENGTH);
      expect(text, ctx.lesson.id).toContain(ctx.kp.title);
      expect(text).toContain(ctx.unit.title);
      expect(text).toContain(ctx.book.edition);
      expect(text).toContain(ctx.lesson.focus);
      expect(text).toContain(`${ctx.lesson.minutes} 分钟`);
      expect(text).toContain(ctx.book.grade === 2 ? '7~8 岁' : '9~10 岁');
      expect(text).toContain('每页文字不超过 40 字');
      const math = ctx.book.subject === 'math';
      if (math) expect(text).toContain('计算必须准确');
      if (ctx.book.subject === 'chinese') expect(text).toContain('小学语文');
      if (ctx.book.subject === 'english') expect(text).toContain('英语单词和句子写英文');
      if (ctx.lesson.kind === 'lecture') {
        if (math) expect(text).toContain('2 道例题');
        expect(text).toContain('学法口诀');
        if (math) expect(text).toContain('快速推理');
        expect(text).toContain('判断题 3 道');
      } else {
        expect(text).toContain('学法口诀');
        expect(text).toContain('判断题 2 道');
        for (const tag of ctx.lesson.remedies ?? []) expect(text).toContain(ERROR_TAGS[tag]);
      }
      for (const c of ctx.kp.localContexts ?? []) expect(text).toContain(c);
    }
    console.info(
      `[prompt] longest requirement: ${longest} chars (limit ${MAX_REQUIREMENT_LENGTH})`,
    );
  });

  it('renders a readable example', () => {
    const ctx = findLesson('bsd-g4a.u3.mul-3x2.tech-partial-product-shift');
    expect(ctx).toBeDefined();
    const text = buildGenerationRequirement(ctx!);
    expect(text).toContain('四年级上册');
    expect(text).toContain('第三单元');
    expect(text).toContain('部分积没有错位');
  });
});
