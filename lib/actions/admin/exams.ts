"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assignSchema, resolveDealers, type AssignInput } from "@/lib/assign";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { formatDateTime, parseDateTimeLocal } from "@/lib/date-utils";
import { examDealerIds, notifyDealers, notifySafely, type NotificationPayload } from "@/lib/notifications";
import { isGuid, sameId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

const POLICIES = ["after_submit", "after_exam_ends", "never"] as const;

const examSchema = z
  .object({
    title: z.string().trim().min(3, "Tên kỳ thi tối thiểu 3 ký tự").max(250),
    description: z.string().trim().max(4000).optional().default(""),
    questionCount: z.coerce.number().int().min(1, "Số câu tối thiểu 1").max(200),
    durationMinutes: z.coerce.number().int().min(1, "Thời lượng tối thiểu 1 phút").max(600),
    passMarkPercent: z.coerce.number().int().min(0).max(100),
    startsAt: z.string().optional().default(""),
    endsAt: z.string().optional().default(""),
    selectionMode: z.enum(["fixed", "random"]),
    shuffleOptions: z.boolean(),
    showScorePolicy: z.enum(POLICIES),
    showAnswerPolicy: z.enum(POLICIES),
    showLeaderboard: z.boolean().optional().default(false),
  })
  .transform((v) => ({ ...v, startsAtDate: parseDateTimeLocal(v.startsAt), endsAtDate: parseDateTimeLocal(v.endsAt) }))
  .refine((v) => !v.startsAt || v.startsAtDate, { message: "Thời gian mở không hợp lệ" })
  .refine((v) => !v.endsAt || v.endsAtDate, { message: "Thời gian đóng không hợp lệ" })
  .refine((v) => !v.startsAtDate || !v.endsAtDate || v.endsAtDate > v.startsAtDate, {
    message: "Thời gian đóng phải sau thời gian mở",
  });

export type ExamInput = z.input<typeof examSchema>;

function examOpenPayload(exam: { id: string; title: string; questionCount: number; durationMinutes: number; endsAt: Date | null }): NotificationPayload {
  return {
    type: "exam",
    title: `Kỳ thi mới: ${exam.title}`,
    body: `${exam.questionCount} câu · ${exam.durationMinutes} phút${exam.endsAt ? ` · đóng lúc ${formatDateTime(exam.endsAt)}` : ""}. Mỗi đại lý có một lượt thi.`,
    link: `/exams/${exam.id}`,
    dedupeKey: `exam-open:${exam.id.toLowerCase()}`,
  };
}

function revalidateExam(id?: string) {
  revalidatePath("/admin/exams");
  if (id) revalidatePath(`/admin/exams/${id}`);
}

export async function saveExamAction(id: string | null, input: ExamInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = examSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const e = parsed.data;
  const data = {
    title: e.title,
    description: e.description || null,
    questionCount: e.questionCount,
    durationMinutes: e.durationMinutes,
    passMarkPercent: e.passMarkPercent,
    startsAt: e.startsAtDate,
    endsAt: e.endsAtDate,
    selectionMode: e.selectionMode,
    shuffleOptions: e.shuffleOptions,
    showScorePolicy: e.showScorePolicy,
    showAnswerPolicy: e.showAnswerPolicy,
    showLeaderboard: e.showLeaderboard,
  };

  if (!id) {
    const exam = await prisma.exam.create({ data: { ...data, createdById: g.userId } });
    await writeAudit({ actorUserId: g.userId, action: "Exam.Create", entityType: "Exam", entityId: exam.id, details: data });
    revalidateExam();
    return { success: true, id: exam.id };
  }

  if (!isGuid(id)) return { error: "Không tìm thấy kỳ thi" };
  const before = await prisma.exam.findUnique({
    where: { id },
    select: {
      title: true,
      status: true,
      questionCount: true,
      durationMinutes: true,
      passMarkPercent: true,
      selectionMode: true,
      startsAt: true,
      endsAt: true,
      showScorePolicy: true,
      showAnswerPolicy: true,
      _count: { select: { attempts: true } },
    },
  });
  if (!before) return { error: "Không tìm thấy kỳ thi" };
  if (before._count.attempts > 0) {
    const locked =
      before.questionCount !== data.questionCount ||
      before.durationMinutes !== data.durationMinutes ||
      before.passMarkPercent !== data.passMarkPercent ||
      before.selectionMode !== data.selectionMode;
    if (locked) {
      return { error: "Kỳ thi đã có lượt làm bài: không được đổi số câu, thời lượng, điểm đạt hoặc cách chọn đề" };
    }
  }

  await prisma.exam.update({ where: { id }, data });
  await writeAudit({ actorUserId: g.userId, action: "Exam.Update", entityType: "Exam", entityId: id, details: { before, after: data } });
  revalidateExam(id);
  return { success: true, id };
}

async function usableQuestionCount(examId: string) {
  const pool = await prisma.examQuestion.findMany({
    where: { examId, question: { status: "published" } },
    select: { question: { select: { options: { select: { isCorrect: true } } } } },
  });
  return pool.filter((p) => p.question.options.length >= 2 && p.question.options.filter((o) => o.isCorrect).length === 1).length;
}

export async function addExamQuestionsAction(examId: string, input: { questionIds?: string[]; categoryId?: string }) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(examId)) return { error: "Không tìm thấy kỳ thi" };

  const existing = await prisma.examQuestion.findMany({ where: { examId }, select: { questionId: true, sortOrder: true } });
  const where =
    input.categoryId && isGuid(input.categoryId)
      ? { status: "published", categoryId: input.categoryId }
      : { status: "published", id: { in: (input.questionIds ?? []).filter(isGuid).slice(0, 500) } };
  const candidates = await prisma.question.findMany({ where, select: { id: true }, orderBy: { createdAt: "asc" } });
  const toAdd = candidates.filter((c) => !existing.some((e) => sameId(e.questionId, c.id)));
  if (toAdd.length === 0) return { error: "Không có câu hỏi đã xuất bản mới để thêm" };

  let order = existing.reduce((m, e) => Math.max(m, e.sortOrder), 0);
  await prisma.examQuestion.createMany({
    data: toAdd.map((q) => ({ examId, questionId: q.id, sortOrder: ++order })),
  });
  await writeAudit({ actorUserId: g.userId, action: "Exam.AddQuestions", entityType: "Exam", entityId: examId, details: { count: toAdd.length } });
  revalidateExam(examId);
  return { success: true, message: `Đã thêm ${toAdd.length} câu hỏi` };
}

export async function removeExamQuestionAction(examId: string, questionId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(examId) || !isGuid(questionId)) return { error: "Không tìm thấy câu hỏi" };
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { status: true, questionCount: true } });
  if (!exam) return { error: "Không tìm thấy kỳ thi" };
  if (exam.status === "published" && (await usableQuestionCount(examId)) - 1 < exam.questionCount) {
    return { error: "Kỳ thi đang mở sẽ không còn đủ câu hỏi nếu gỡ câu này" };
  }
  await prisma.examQuestion.deleteMany({ where: { examId, questionId } });
  await writeAudit({ actorUserId: g.userId, action: "Exam.RemoveQuestion", entityType: "Exam", entityId: examId, details: { questionId } });
  revalidateExam(examId);
  return { success: true, message: "Đã gỡ câu hỏi" };
}

export async function assignExamAction(examId: string, input: AssignInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(examId)) return { error: "Không tìm thấy kỳ thi" };
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { ids, missing } = await resolveDealers(parsed.data);
  const existing = await prisma.examAssignment.findMany({ where: { examId }, select: { dealerId: true } });
  const toAdd = ids.filter((id) => !existing.some((e) => sameId(e.dealerId, id)));
  if (toAdd.length) await prisma.examAssignment.createMany({ data: toAdd.map((dealerId) => ({ examId, dealerId })) });
  await writeAudit({
    actorUserId: g.userId,
    action: "Exam.Assign",
    entityType: "Exam",
    entityId: examId,
    details: { mode: parsed.data.mode, added: toAdd.length, missing },
  });
  revalidateExam(examId);
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, status: true, title: true, questionCount: true, durationMinutes: true, endsAt: true },
  });
  if (exam?.status === "published" && toAdd.length) {
    await notifySafely(() => notifyDealers(toAdd, examOpenPayload(exam)));
  }
  return {
    success: true,
    message:
      `Đã giao thêm ${toAdd.length} đại lý` +
      (missing.length ? `. Không tìm thấy: ${missing.slice(0, 10).join(", ")}` : "") +
      (exam?.status === "draft" ? ". Kỳ thi đang là bản nháp — đại lý chỉ thấy sau khi bạn bấm Xuất bản" : ""),
  };
}

export async function unassignExamAction(examId: string, dealerId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(examId) || !isGuid(dealerId)) return { error: "Không tìm thấy" };
  await prisma.examAssignment.deleteMany({ where: { examId, dealerId } });
  await writeAudit({ actorUserId: g.userId, action: "Exam.Unassign", entityType: "Exam", entityId: examId, details: { dealerId } });
  revalidateExam(examId);
  return { success: true, message: "Đã bỏ giao" };
}

export async function setExamStatusAction(examId: string, status: "published" | "closed" | "archived" | "draft") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(examId)) return { error: "Không tìm thấy kỳ thi" };
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { status: true, questionCount: true, startsAt: true, endsAt: true, _count: { select: { assignments: true, attempts: true } } },
  });
  if (!exam) return { error: "Không tìm thấy kỳ thi" };

  if (status === "published") {
    const usable = await usableQuestionCount(examId);
    if (usable < exam.questionCount) {
      return { error: `Chưa đủ câu hỏi đã xuất bản: có ${usable}/${exam.questionCount} câu (EX-01)` };
    }
    if (exam._count.assignments === 0) return { error: "Chưa giao kỳ thi cho đại lý nào" };
    if (exam.endsAt && exam.endsAt <= new Date()) return { error: "Thời gian đóng đã qua, hãy cập nhật lịch thi" };
  }
  if (status === "draft" && exam._count.attempts > 0) return { error: "Kỳ thi đã có lượt làm bài, không thể chuyển về bản nháp" };

  const updated = await prisma.exam.update({
    where: { id: examId },
    data: { status },
    select: { id: true, title: true, questionCount: true, durationMinutes: true, endsAt: true, showScorePolicy: true, showAnswerPolicy: true },
  });
  await writeAudit({
    actorUserId: g.userId,
    action: `Exam.${status === "published" ? "Publish" : status === "closed" ? "Close" : status === "archived" ? "Archive" : "Unpublish"}`,
    entityType: "Exam",
    entityId: examId,
    details: { from: exam.status, to: status },
  });
  if (status === "published") {
    await notifySafely(async () => notifyDealers(await examDealerIds(examId), examOpenPayload(updated)));
  }
  if (status === "closed") {
    const revealsScore = updated.showScorePolicy === "after_exam_ends";
    const revealsAnswers = updated.showAnswerPolicy === "after_exam_ends";
    if (revealsScore || revealsAnswers) {
      await notifySafely(async () => {
        const attempts = await prisma.examAttempt.findMany({
          where: { examId, status: { in: ["Submitted", "Expired"] } },
          select: { id: true, dealerId: true },
        });
        for (const a of attempts) {
          await notifyDealers([a.dealerId], {
            type: "exam_result",
            title: revealsScore ? `Đã có kết quả: ${updated.title}` : `Đã công bố đáp án: ${updated.title}`,
            body: revealsScore && revealsAnswers ? "Xem điểm và đáp án chi tiết bài làm của bạn." : revealsScore ? "Xem điểm bài làm của bạn." : "Xem đáp án chi tiết bài làm của bạn.",
            link: `/attempts/${a.id}/result`,
            dedupeKey: `exam-result:${a.id.toLowerCase()}`,
          });
        }
      });
    }
  }
  revalidateExam(examId);
  return {
    success: true,
    message: { published: "Đã mở kỳ thi", closed: "Đã đóng kỳ thi", archived: "Đã lưu trữ", draft: "Đã chuyển về bản nháp" }[status],
  };
}

export async function deleteExamAction(examId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(examId)) return { error: "Không tìm thấy kỳ thi" };
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { status: true, title: true, _count: { select: { attempts: true } } } });
  if (!exam) return { error: "Không tìm thấy kỳ thi" };
  if (exam.status !== "draft" || exam._count.attempts > 0) return { error: "Chỉ xóa được kỳ thi bản nháp chưa có lượt làm bài" };
  await prisma.exam.delete({ where: { id: examId } });
  await writeAudit({ actorUserId: g.userId, action: "Exam.Delete", entityType: "Exam", entityId: examId, details: { title: exam.title } });
  revalidateExam();
  return { success: true, message: "Đã xóa kỳ thi" };
}
