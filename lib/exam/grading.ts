import { sameId } from "@/lib/ids";
import type { QuestionSnapshot } from "@/lib/exam/types";

export interface GradeInput {
  attemptQuestionId: string;
  points: number;
  snapshot: QuestionSnapshot;
}

export interface GradeAnswer {
  attemptQuestionId: string;
  selectedOptionId: string | null;
}

export interface GradeResult {
  correctCount: number;
  earnedPoints: number;
  totalPoints: number;
  scorePercent: number;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function gradeAttempt(questions: GradeInput[], answers: GradeAnswer[]): GradeResult {
  let correctCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;

  for (const q of questions) {
    totalPoints += q.points;
    const answer = answers.find((a) => sameId(a.attemptQuestionId, q.attemptQuestionId));
    if (answer && sameId(answer.selectedOptionId, q.snapshot.correctOptionId)) {
      correctCount += 1;
      earnedPoints += q.points;
    }
  }

  const scorePercent = totalPoints > 0 ? round2((earnedPoints / totalPoints) * 100) : 0;
  return { correctCount, earnedPoints, totalPoints, scorePercent };
}

export function isPassed(scorePercent: number, passMarkPercent: number): boolean {
  return scorePercent >= passMarkPercent;
}
