import { prisma } from "@/lib/prisma";
import { isGuid, normId } from "@/lib/ids";
import { round2 } from "@/lib/exam/grading";
import { ATTEMPT_STATUS } from "@/lib/exam/types";

export type ReportStatus = "NotStarted" | "InProgress" | "Submitted" | "Expired";

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  NotStarted: "Chưa thi",
  InProgress: "Đang làm",
  Submitted: "Đã nộp",
  Expired: "Hết giờ",
};

export interface ExamReportRow {
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  region: string | null;
  attemptId: string | null;
  attemptNo: number | null;
  status: ReportStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationSeconds: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  scorePercent: number | null;
  isPassed: boolean | null;
  voidedCount: number;
}

export interface ReportFilters {
  region?: string;
  status?: string;
  q?: string;
  result?: string;
}

export interface ExamReport {
  exam: {
    id: string;
    title: string;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
    passMarkPercent: number;
    questionCount: number;
    durationMinutes: number;
  };
  rows: ExamReportRow[];
  summary: {
    assigned: number;
    attempted: number;
    inProgress: number;
    finished: number;
    passed: number;
    failed: number;
    notStarted: number;
    passRate: number;
    avgScore: number;
  };
  regions: string[];
}

export async function getExamReport(examId: string, filters: ReportFilters = {}): Promise<ExamReport | null> {
  if (!isGuid(examId)) return null;
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      passMarkPercent: true,
      questionCount: true,
      durationMinutes: true,
    },
  });
  if (!exam) return null;

  const [assignments, attempts] = await Promise.all([
    prisma.examAssignment.findMany({
      where: { examId },
      select: { dealer: { select: { id: true, code: true, name: true, region: true } } },
    }),
    prisma.examAttempt.findMany({
      where: { examId },
      orderBy: { attemptNo: "desc" },
      select: {
        id: true,
        attemptNo: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        correctCount: true,
        totalQuestions: true,
        scorePercent: true,
        isPassed: true,
        dealer: { select: { id: true, code: true, name: true, region: true } },
      },
    }),
  ]);

  const dealers = new Map<string, { id: string; code: string; name: string; region: string | null }>();
  assignments.forEach((a) => dealers.set(normId(a.dealer.id), a.dealer));
  attempts.forEach((a) => dealers.set(normId(a.dealer.id), a.dealer));

  const all: ExamReportRow[] = [...dealers.values()].map((d) => {
    const mine = attempts.filter((a) => normId(a.dealer.id) === normId(d.id));
    const active = mine.find((a) => a.status !== ATTEMPT_STATUS.Voided) ?? null;
    const status: ReportStatus = active ? (active.status as ReportStatus) : "NotStarted";
    return {
      dealerId: d.id,
      dealerCode: d.code,
      dealerName: d.name,
      region: d.region,
      attemptId: active?.id ?? null,
      attemptNo: active?.attemptNo ?? null,
      status,
      startedAt: active?.startedAt ?? null,
      finishedAt: active?.finishedAt ?? null,
      durationSeconds:
        active?.finishedAt ? Math.round((active.finishedAt.getTime() - active.startedAt.getTime()) / 1000) : null,
      correctCount: active?.correctCount ?? null,
      totalQuestions: active?.totalQuestions ?? null,
      scorePercent: active?.scorePercent ?? null,
      isPassed: active?.isPassed ?? null,
      voidedCount: mine.filter((a) => a.status === ATTEMPT_STATUS.Voided).length,
    };
  });
  all.sort((a, b) => a.dealerCode.localeCompare(b.dealerCode));

  const finishedRows = all.filter((r) => r.status === "Submitted" || r.status === "Expired");
  const passed = finishedRows.filter((r) => r.isPassed).length;
  const summary = {
    assigned: assignments.length,
    attempted: all.filter((r) => r.status !== "NotStarted").length,
    inProgress: all.filter((r) => r.status === "InProgress").length,
    finished: finishedRows.length,
    passed,
    failed: finishedRows.length - passed,
    notStarted: all.filter((r) => r.status === "NotStarted").length,
    passRate: finishedRows.length ? round2((passed / finishedRows.length) * 100) : 0,
    avgScore: finishedRows.length
      ? round2(finishedRows.reduce((s, r) => s + (r.scorePercent ?? 0), 0) / finishedRows.length)
      : 0,
  };

  const q = filters.q?.trim().toLowerCase();
  const rows = all.filter((r) => {
    if (filters.region && r.region !== filters.region) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.result === "passed" && r.isPassed !== true) return false;
    if (filters.result === "failed" && r.isPassed !== false) return false;
    if (q && !r.dealerCode.toLowerCase().includes(q) && !r.dealerName.toLowerCase().includes(q)) return false;
    return true;
  });

  const regions = [...new Set(all.map((r) => r.region).filter((r): r is string => Boolean(r)))].sort();
  return { exam, rows, summary, regions };
}
