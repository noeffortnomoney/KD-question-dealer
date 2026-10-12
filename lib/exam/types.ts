export const ATTEMPT_STATUS = {
  InProgress: "InProgress",
  Submitted: "Submitted",
  Expired: "Expired",
  Voided: "Voided",
} as const;

export type AttemptStatus = (typeof ATTEMPT_STATUS)[keyof typeof ATTEMPT_STATUS];
export type FinalStatus = typeof ATTEMPT_STATUS.Submitted | typeof ATTEMPT_STATUS.Expired;

export type VisibilityPolicy = "after_submit" | "after_exam_ends" | "never";

export interface SnapshotOption {
  id: string;
  text: string;
}

export interface QuestionSnapshot {
  questionId: string;
  questionVersion: number;
  stem: string;
  options: SnapshotOption[];
  correctOptionId: string;
  explanation: string | null;
}

export interface ExamQuestionDto {
  attemptQuestionId: string;
  order: number;
  stem: string;
  options: { optionId: string; text: string }[];
  selectedOptionId: string | null;
  version: number;
}

export interface AttemptView {
  attemptId: string;
  examId: string;
  title: string;
  status: AttemptStatus;
  startedAtUtc: string;
  deadlineAtUtc: string;
  serverNowUtc: string;
  totalQuestions: number;
  questions?: ExamQuestionDto[];
}

export interface ScoreView {
  visible: boolean;
  availableAtUtc: string | null;
  correct?: number;
  total?: number;
  scorePercent?: number;
  passMarkPercent?: number;
  isPassed?: boolean;
}

export interface ReviewItem {
  order: number;
  stem: string;
  options: { optionId: string; text: string }[];
  selectedOptionId: string | null;
  correctOptionId: string;
  explanation: string | null;
}

export interface ResultView {
  attemptId: string;
  examId: string;
  examTitle: string;
  status: AttemptStatus;
  startedAtUtc: string;
  submittedAtUtc: string | null;
  finishedAtUtc: string | null;
  durationSeconds: number | null;
  answeredCount: number;
  totalQuestions: number;
  score: ScoreView;
  answers: { visible: boolean; availableAtUtc: string | null; items?: ReviewItem[] };
}

export type DealerExamState =
  | "not_open"
  | "can_start"
  | "in_progress"
  | "finished"
  | "reissued"
  | "closed";
