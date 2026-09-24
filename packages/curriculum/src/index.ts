import type { Book, KnowledgePoint, LessonSpec, Unit } from './types';
import { bsdG2a } from './books/bsd-g2a';
import { bsdG4a } from './books/bsd-g4a';
import { enG2a } from './books/en-g2a';
import { enG4a } from './books/en-g4a';

export type { Book, KnowledgePoint, LessonSpec, PracticeSpec, Subject, Unit } from './types';
export { SUBJECT_LABEL } from './types';
export { buildGenerationRequirement, lessonTemplateVersion } from './prompt';
export type { LessonContext } from './prompt';

export const BOOKS: readonly Book[] = [bsdG2a, bsdG4a, enG2a, enG4a];

export interface KnowledgePointRef {
  book: Book;
  unit: Unit;
  kp: KnowledgePoint;
}

export interface LessonRef extends KnowledgePointRef {
  lesson: LessonSpec;
}

export function getBook(id: string): Book | undefined {
  return BOOKS.find((b) => b.id === id);
}

export function allKnowledgePoints(): KnowledgePointRef[] {
  return BOOKS.flatMap((book) =>
    book.units.flatMap((unit) => unit.knowledgePoints.map((kp) => ({ book, unit, kp }))),
  );
}

export function findKnowledgePoint(id: string): KnowledgePointRef | undefined {
  return allKnowledgePoints().find((r) => r.kp.id === id);
}

export function allLessons(): LessonRef[] {
  return allKnowledgePoints().flatMap((r) => r.kp.lessons.map((lesson) => ({ ...r, lesson })));
}

export function findLesson(id: string): LessonRef | undefined {
  return allLessons().find((r) => r.lesson.id === id);
}
