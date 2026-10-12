import { shuffle } from "@/lib/exam/select";
import type { ExamQuestionDto, QuestionSnapshot } from "@/lib/exam/types";

export interface SourceQuestion {
  id: string;
  version: number;
  stem: string;
  explanation: string | null;
  options: { id: string; text: string; isCorrect: boolean; sortOrder: number }[];
}

export function buildSnapshot(
  question: SourceQuestion,
  shuffleOptions: boolean,
  rand?: (max: number) => number
): QuestionSnapshot {
  const ordered = question.options.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const options = shuffleOptions ? shuffle(ordered, rand) : ordered;
  const correct = ordered.find((o) => o.isCorrect);
  if (!correct) throw new Error(`Question ${question.id} has no correct option`);
  return {
    questionId: question.id,
    questionVersion: question.version,
    stem: question.stem,
    options: options.map((o) => ({ id: o.id, text: o.text })),
    correctOptionId: correct.id,
    explanation: question.explanation,
  };
}

export function parseSnapshot(raw: string): QuestionSnapshot {
  return JSON.parse(raw) as QuestionSnapshot;
}

export function toExamQuestionDto(input: {
  attemptQuestionId: string;
  order: number;
  snapshot: QuestionSnapshot;
  selectedOptionId: string | null;
  version: number;
}): ExamQuestionDto {
  return {
    attemptQuestionId: input.attemptQuestionId,
    order: input.order,
    stem: input.snapshot.stem,
    options: input.snapshot.options.map((o) => ({ optionId: o.id, text: o.text })),
    selectedOptionId: input.selectedOptionId,
    version: input.version,
  };
}
