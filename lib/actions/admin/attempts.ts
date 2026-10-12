"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { reissueAttempt } from "@/lib/exam/engine";
import { parseSnapshot } from "@/lib/exam/snapshot";
import { isGuid, sameId } from "@/lib/ids";
import { notifyDealers, notifySafely } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export interface AttemptDetail {
  id: string;
  status: string;
  attemptNo: number;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  finishedAt: string | null;
  correctCount: number | null;
  totalQuestions: number;
  scorePercent: number | null;
  isPassed: boolean | null;
  voidReason: string | null;
  voidReasonCategory: string | null;
  voidedAt: string | null;
  dealer: { code: string; name: string; region: string | null };
  user: { name: string; email: string };
  exam: { id: string; title: string; passMarkPercent: number };
  answeredCount: number;
  items: {
    order: number;
    stem: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
    selectedOptionId: string | null;
    savedAt: string | null;
  }[];
  history: { id: string; attemptNo: number; status: string; scorePercent: number | null; voidReason: string | null }[];
}

export async function getAttemptDetailAction(attemptId: string): Promise<{ error?: string; data?: AttemptDetail }> {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(attemptId)) return { error: "Không tìm thấy lượt thi" };
  const a = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      dealerId: true,
      status: true,
      attemptNo: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      finishedAt: true,
      correctCount: true,
      totalQuestions: true,
      scorePercent: true,
      isPassed: true,
      voidReason: true,
      voidReasonCategory: true,
      voidedAt: true,
      dealer: { select: { code: true, name: true, region: true } },
      user: { select: { name: true, email: true } },
      exam: { select: { id: true, title: true, passMarkPercent: true } },
      questions: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true, snapshot: true } },
      answers: { select: { attemptQuestionId: true, selectedOptionId: true, updatedAt: true } },
    },
  });
  if (!a) return { error: "Không tìm thấy lượt thi" };

  const history = await prisma.examAttempt.findMany({
    where: { examId: a.examId, dealerId: a.dealerId },
    orderBy: { attemptNo: "asc" },
    select: { id: true, attemptNo: true, status: true, scorePercent: true, voidReason: true },
  });

  return {
    data: {
      id: a.id,
      status: a.status,
      attemptNo: a.attemptNo,
      startedAt: a.startedAt.toISOString(),
      deadlineAt: a.deadlineAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      finishedAt: a.finishedAt?.toISOString() ?? null,
      correctCount: a.correctCount,
      totalQuestions: a.totalQuestions,
      scorePercent: a.scorePercent,
      isPassed: a.isPassed,
      voidReason: a.voidReason,
      voidReasonCategory: a.voidReasonCategory,
      voidedAt: a.voidedAt?.toISOString() ?? null,
      dealer: a.dealer,
      user: a.user,
      exam: a.exam,
      answeredCount: a.answers.filter((x) => x.selectedOptionId).length,
      items: a.questions.map((q) => {
        const s = parseSnapshot(q.snapshot);
        const ans = a.answers.find((x) => sameId(x.attemptQuestionId, q.id));
        return {
          order: q.sortOrder,
          stem: s.stem,
          options: s.options,
          correctOptionId: s.correctOptionId,
          selectedOptionId: ans?.selectedOptionId ?? null,
          savedAt: ans?.updatedAt.toISOString() ?? null,
        };
      }),
      history,
    },
  };
}

const reissueSchema = z.object({
  reason: z.string().trim().min(10, "Lý do tối thiểu 10 ký tự").max(1000),
  reasonCategory: z.enum(["SystemIncident", "DealerDeviceOrNetwork", "Other"]),
});

export async function reissueAttemptAction(attemptId: string, input: z.input<typeof reissueSchema>) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = reissueSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const res = await reissueAttempt({ attemptId, adminUserId: g.userId, ...parsed.data });
  if (!res.ok) return { error: res.error };
  await notifySafely(async () => {
    const a = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      select: { dealerId: true, exam: { select: { id: true, title: true, status: true } } },
    });
    if (!a) return;
    await notifyDealers([a.dealerId], {
      type: "reissue",
      title: `Bạn được cấp lại lượt thi: ${a.exam.title}`,
      body:
        a.exam.status === "published"
          ? "Lượt thi trước đã được hủy. Bạn có thể làm bài lại từ đầu."
          : "Lượt thi trước đã được hủy. Bạn làm lại được khi kỳ thi mở lại.",
      link: `/exams/${a.exam.id}`,
      dedupeKey: `reissue:${attemptId.toLowerCase()}`,
    });
  });
  revalidatePath("/admin/reports");
  revalidatePath("/admin/audit-logs");
  return { success: true, message: "Đã hủy lượt thi cũ và cấp lại lượt mới" };
}
