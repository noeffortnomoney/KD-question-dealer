import { ATTEMPT_STATUS, type DealerExamState, type VisibilityPolicy } from "@/lib/exam/types";

export const GRACE_MS = Math.max(0, Number(process.env.EXAM_GRACE_SECONDS ?? 10)) * 1000;

export interface ExamTiming {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

export function isOverdue(deadlineAt: Date, now: Date, graceMs = GRACE_MS): boolean {
  return now.getTime() > deadlineAt.getTime() + graceMs;
}

export function computeDeadline(startedAt: Date, durationMinutes: number, examEndsAt: Date | null): Date {
  const byDuration = new Date(startedAt.getTime() + durationMinutes * 60_000);
  if (examEndsAt && examEndsAt < byDuration) return examEndsAt;
  return byDuration;
}

export function isExamOpen(exam: ExamTiming, now: Date): boolean {
  if (exam.status !== "published") return false;
  if (exam.startsAt && now < exam.startsAt) return false;
  if (exam.endsAt && now >= exam.endsAt) return false;
  return true;
}

export function hasExamEnded(exam: ExamTiming, now: Date): boolean {
  if (exam.status === "closed" || exam.status === "archived") return true;
  return Boolean(exam.endsAt && now >= exam.endsAt);
}

export function visibility(
  policy: string,
  exam: ExamTiming,
  now: Date
): { visible: boolean; availableAt: Date | null } {
  const p = policy as VisibilityPolicy;
  if (p === "after_submit") return { visible: true, availableAt: null };
  if (p === "after_exam_ends") {
    return { visible: hasExamEnded(exam, now), availableAt: exam.endsAt };
  }
  return { visible: false, availableAt: null };
}

export interface AttemptLite {
  status: string;
  deadlineAt: Date;
}

export function dealerExamState(
  exam: ExamTiming,
  activeAttempt: AttemptLite | null,
  hasVoidedAttempt: boolean,
  now: Date
): DealerExamState {
  if (activeAttempt) {
    if (activeAttempt.status === ATTEMPT_STATUS.InProgress && !isOverdue(activeAttempt.deadlineAt, now)) {
      return "in_progress";
    }
    return "finished";
  }
  if (exam.status !== "published") return "closed";
  if (exam.startsAt && now < exam.startsAt) return "not_open";
  if (exam.endsAt && now >= exam.endsAt) return "closed";
  return hasVoidedAttempt ? "reissued" : "can_start";
}

export function slotKeyFor(examId: string, dealerId: string): string {
  return `${examId}:${dealerId}`.toLowerCase();
}

export function voidedSlotKey(slotKey: string, attemptId: string): string {
  return `${slotKey}:void:${attemptId}`.toLowerCase();
}
