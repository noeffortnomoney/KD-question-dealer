"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { isGuid, sameId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Tên chủ đề là bắt buộc").max(200),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function saveCategoryAction(id: string | null, input: { name: string; sortOrder?: number }) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  if (id) {
    if (!isGuid(id)) return { error: "Không tìm thấy chủ đề" };
    await prisma.questionCategory.update({ where: { id }, data: parsed.data });
  } else {
    await prisma.questionCategory.create({ data: parsed.data });
  }
  revalidatePath("/admin/questions");
  return { success: true };
}

export async function setCategoryStatusAction(id: string, status: "active" | "archived") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(id)) return { error: "Không tìm thấy chủ đề" };
  await prisma.questionCategory.update({ where: { id }, data: { status } });
  revalidatePath("/admin/questions");
  return { success: true };
}

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1, "Nội dung lựa chọn không được trống").max(1000),
  isCorrect: z.boolean(),
});

const questionSchema = z
  .object({
    categoryId: z.string().refine(isGuid, "Chọn chủ đề"),
    stem: z.string().trim().min(5, "Nội dung câu hỏi tối thiểu 5 ký tự").max(4000),
    explanation: z.string().trim().max(4000).optional().default(""),
    difficulty: z.coerce.number().int().min(1).max(3),
    options: z.array(optionSchema).min(2, "Cần ít nhất 2 lựa chọn").max(6, "Tối đa 6 lựa chọn"),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Câu hỏi trắc nghiệm một đáp án phải có đúng 1 đáp án đúng",
  });

export type QuestionInput = z.input<typeof questionSchema>;

export async function saveQuestionAction(id: string | null, input: QuestionInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const q = parsed.data;

  if (!id) {
    const created = await prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          categoryId: q.categoryId,
          stem: q.stem,
          explanation: q.explanation || null,
          difficulty: q.difficulty,
          createdById: g.userId,
          options: { create: q.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, sortOrder: i + 1 })) },
        },
      });
      await writeAudit({ actorUserId: g.userId, action: "Question.Create", entityType: "Question", entityId: question.id }, tx);
      return question;
    });
    revalidatePath("/admin/questions");
    return { success: true, id: created.id };
  }

  if (!isGuid(id)) return { error: "Không tìm thấy câu hỏi" };
  const before = await prisma.question.findUnique({
    where: { id },
    select: {
      status: true,
      version: true,
      stem: true,
      explanation: true,
      categoryId: true,
      difficulty: true,
      options: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true, isCorrect: true } },
    },
  });
  if (!before) return { error: "Không tìm thấy câu hỏi" };

  const contentChanged =
    before.stem !== q.stem ||
    (before.explanation ?? "") !== q.explanation ||
    before.options.length !== q.options.length ||
    q.options.some((o, i) => before.options[i]?.text !== o.text || before.options[i]?.isCorrect !== o.isCorrect);

  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id },
      data: {
        categoryId: q.categoryId,
        stem: q.stem,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        version: before.status === "published" && contentChanged ? before.version + 1 : before.version,
      },
    });
    const keep = q.options.filter((o) => o.id && before.options.some((b) => sameId(b.id, o.id))).map((o) => o.id!);
    await tx.questionOption.deleteMany({ where: { questionId: id, id: { notIn: keep } } });
    for (const [i, o] of q.options.entries()) {
      if (o.id && keep.some((k) => sameId(k, o.id))) {
        await tx.questionOption.update({ where: { id: o.id }, data: { text: o.text, isCorrect: o.isCorrect, sortOrder: i + 1 } });
      } else {
        await tx.questionOption.create({ data: { questionId: id, text: o.text, isCorrect: o.isCorrect, sortOrder: i + 1 } });
      }
    }
    await writeAudit(
      {
        actorUserId: g.userId,
        action: "Question.Update",
        entityType: "Question",
        entityId: id,
        details: before.status === "published" ? { before, after: q, versionBumped: contentChanged } : undefined,
      },
      tx
    );
  });
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return { success: true, id };
}

export async function setQuestionStatusAction(id: string, status: "draft" | "published" | "archived") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(id)) return { error: "Không tìm thấy câu hỏi" };

  const question = await prisma.question.findUnique({
    where: { id },
    select: { status: true, options: { select: { isCorrect: true } } },
  });
  if (!question) return { error: "Không tìm thấy câu hỏi" };

  if (status === "published") {
    if (question.options.length < 2 || question.options.filter((o) => o.isCorrect).length !== 1) {
      return { error: "Câu hỏi cần ít nhất 2 lựa chọn và đúng 1 đáp án đúng" };
    }
  } else if (question.status === "published") {
    const openExam = await prisma.exam.findFirst({
      where: {
        status: "published",
        questions: { some: { questionId: id } },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { title: true },
    });
    if (openExam) {
      return { error: `Câu hỏi đang nằm trong kỳ thi đang mở "${openExam.title}". Gỡ khỏi kỳ thi trước.` };
    }
  }

  await prisma.question.update({
    where: { id },
    data: { status, publishedAt: status === "published" ? new Date() : undefined },
  });
  await writeAudit({
    actorUserId: g.userId,
    action: status === "published" ? "Question.Publish" : status === "archived" ? "Question.Archive" : "Question.Unpublish",
    entityType: "Question",
    entityId: id,
  });
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return { success: true, message: status === "published" ? "Đã xuất bản" : status === "archived" ? "Đã lưu trữ" : "Đã chuyển về bản nháp" };
}
