import type { Prisma } from "@prisma/client";
import type { Label } from "@/lib/labels";

export type ExamPhase = "draft" | "upcoming" | "open" | "ended" | "closed" | "archived";

export interface ExamPhaseInput {
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
}

export function examPhase(exam: ExamPhaseInput, now = new Date()): ExamPhase {
  if (exam.status === "draft") return "draft";
  if (exam.status === "closed") return "closed";
  if (exam.status === "archived") return "archived";
  if (exam.endsAt && now >= exam.endsAt) return "ended";
  if (exam.startsAt && now < exam.startsAt) return "upcoming";
  return "open";
}

export const EXAM_PHASE_LABEL: Record<ExamPhase, Label> = {
  draft: { text: "Bản nháp", tone: "muted" },
  upcoming: { text: "Sắp mở", tone: "info" },
  open: { text: "Đang mở", tone: "success" },
  ended: { text: "Hết giờ · chưa đóng", tone: "warning" },
  closed: { text: "Đã đóng", tone: "info" },
  archived: { text: "Lưu trữ", tone: "muted" },
};

export const EXAM_PHASE_ORDER: Record<ExamPhase, number> = { open: 0, upcoming: 1, ended: 2, draft: 3, closed: 4, archived: 5 };

export function isExamPhase(value: string | undefined): value is ExamPhase {
  return Boolean(value && value in EXAM_PHASE_LABEL);
}

export function examPhaseWhere(phase: ExamPhase, now = new Date()): Prisma.ExamWhereInput {
  const started: Prisma.ExamWhereInput = { OR: [{ startsAt: null }, { startsAt: { lte: now } }] };
  const notEnded: Prisma.ExamWhereInput = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
  switch (phase) {
    case "upcoming":
      return { status: "published", startsAt: { gt: now }, AND: [notEnded] };
    case "open":
      return { status: "published", AND: [started, notEnded] };
    case "ended":
      return { status: "published", endsAt: { lte: now } };
    default:
      return { status: phase };
  }
}
