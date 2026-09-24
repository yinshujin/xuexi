import { GENERATOR_IDS, type GeneratorId } from '@xuexi/shared';
import type { PracticeGenerator } from './generators/base';
import { g2AddSub2d } from './generators/g2-addsub-2d';
import { g2AddSubChain } from './generators/g2-addsub-chain';
import { g2DivTable } from './generators/g2-div-table';
import { g2MulMeaning } from './generators/g2-mul-meaning';
import { g2MulTable } from './generators/g2-mul-table';
import { g2UnitLength, g2UnitMoney } from './generators/g2-units';
import { g4AngleClassify, g4AngleMeasure } from './generators/g4-angle';
import { g4BignumCompare } from './generators/g4-bignum-compare';
import { g4BignumRead } from './generators/g4-bignum-read';
import { g4BignumRewrite } from './generators/g4-bignum-rewrite';
import { g4Div2d } from './generators/g4-div-2d';
import { g4LawSimplify } from './generators/g4-law-simplify';
import { g4Mul3x2 } from './generators/g4-mul-3x2';
import { g4MulEstimate } from './generators/g4-mul-estimate';
import { g4Negative } from './generators/g4-negative';
import { g4OralMulDiv } from './generators/g4-oral-muldiv';
import type { GenerateOptions, GradeResult, Question, Response } from './types';

/** Every generator, in catalog order. */
export const ALL_GENERATORS: readonly PracticeGenerator[] = [
  g2AddSub2d,
  g2AddSubChain,
  g2MulMeaning,
  g2MulTable,
  g2DivTable,
  g2UnitMoney,
  g2UnitLength,
  g4BignumRead,
  g4BignumRewrite,
  g4BignumCompare,
  g4OralMulDiv,
  g4Mul3x2,
  g4MulEstimate,
  g4Div2d,
  g4LawSimplify,
  g4AngleMeasure,
  g4AngleClassify,
  g4Negative,
] as readonly PracticeGenerator[];

const BY_ID = new Map<string, PracticeGenerator>(ALL_GENERATORS.map((g) => [g.id, g]));

// Fail fast if the catalog and the registry drift apart.
for (const id of GENERATOR_IDS)
  if (!BY_ID.has(id)) throw new Error(`practice: no generator registered for ${id}`);

export function getGenerator(id: GeneratorId | string): PracticeGenerator {
  const g = BY_ID.get(id);
  if (!g) throw new Error(`practice: unknown generator ${id}`);
  return g;
}

export function hasGenerator(id: string): boolean {
  return BY_ID.has(id);
}

/**
 * Build a question. Deterministic in (generatorId, difficulty, seed, variant).
 * Variant `base@errorTag` builds a remediation question (see targetFor).
 * Throws on an unknown generator id or variant.
 */
export function generateQuestion(
  generatorId: GeneratorId | string,
  opts: GenerateOptions,
): Question {
  return getGenerator(generatorId).generate(opts);
}

/** Grade a response to any generated question. */
export function gradeQuestion(question: Question, response: Response): GradeResult {
  return getGenerator(question.generatorId).grade(question, response);
}
