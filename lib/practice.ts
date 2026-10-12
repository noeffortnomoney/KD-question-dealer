import { prisma } from "@/lib/prisma";
import { fail, ok, type Result } from "@/lib/http";
import { isGuid, sameId } from "@/lib/ids";
import { shuffle } from "@/lib/exam/select";
import type { DealerContext } from "@/lib/exam/engine";

export const PRACTICE_SIZES = [10, 20, 30] as const;

function practiceQuestionFilter(now: Date, categoryId: string | null) {
  return {
    status: "published",
    ...(categoryId ? { categoryId } : {}),
    category: { status: "active" },
    examQuestions: {
      none: {
        exam: {
          status: "published",
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      },
    },
  };
}

export interface PracticeCategory {
  id: string;
  name: string;
  available: number;
}

export async function listPracticeCategories(): Promise<PracticeCategory[]> {
  const now = new Date();
  const [categories, counts] = await Promise.all([
    prisma.questionCategory.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.question.groupBy({
      by: ["categoryId"],
      where: practiceQuestionFilter(now, null),
      _count: { _all: true },
    }),
  ]);
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    available: counts.find((x) => sameId(x.categoryId, c.id))?._count._all ?? 0,
  }));
}

export async function createPracticeSession(
  ctx: DealerContext,
  categoryId: string | null,
  size: number
): Promise<Result<{ sessionId: string }>> {
  if (categoryId && !isGuid(categoryId)) return fail(404, "NOT_FOUND", "Không tìm thấy chủ đề");
  const now = new Date();
  const candidates = await prisma.question.findMany({
    where: practiceQuestionFilter(now, categoryId),
    select: { id: true },
  });
  if (candidates.length === 0) return fail(409, "CONFLICT", "Chủ đề này chưa có câu hỏi để ôn tập");

  const picked = shuffle(candidates).slice(0, Math.min(size, candidates.length));
  const session = await prisma.practiceSession.create({
    data: {
      userId: ctx.userId,
      dealerId: ctx.dealerId,
      categoryId,
      questionCount: picked.length,
      answers: { create: picked.map((q, i) => ({ questionId: q.id, sortOrder: i + 1 })) },
    },
    select: { id: true },
  });
  return ok({ sessionId: session.id }, 201);
}

export interface PracticeItem {
  questionId: string;
  order: number;
  stem: string;
  options: { optionId: string; text: string }[];
  selectedOptionId: string | null;
  answered: boolean;
  isCorrect: boolean | null;
  correctOptionId: string | null;
  explanation: string | null;
}

export interface PracticeView {
  sessionId: string;
  categoryName: string | null;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  startedAtUtc: string;
  finishedAtUtc: string | null;
  items: PracticeItem[];
}

export async function getPracticeSession(sessionId: string, dealerId: string): Promise<Result<PracticeView>> {
  if (!isGuid(sessionId)) return fail(404, "NOT_FOUND", "Không tìm thấy phiên ôn tập");
  const s = await prisma.practiceSession.findFirst({
    where: { id: sessionId, dealerId },
    select: {
      id: true,
      questionCount: true,
      answeredCount: true,
      correctCount: true,
      startedAt: true,
      finishedAt: true,
      category: { select: { name: true } },
      answers: {
        orderBy: { sortOrder: "asc" },
        select: {
          questionId: true,
          sortOrder: true,
          selectedOptionId: true,
          isCorrect: true,
          answeredAt: true,
          question: {
            select: {
              stem: true,
              explanation: true,
              options: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true, isCorrect: true } },
            },
          },
        },
      },
    },
  });
  if (!s) return fail(404, "NOT_FOUND", "Không tìm thấy phiên ôn tập");

  return ok({
    sessionId: s.id,
    categoryName: s.category?.name ?? null,
    questionCount: s.questionCount,
    answeredCount: s.answeredCount,
    correctCount: s.correctCount,
    startedAtUtc: s.startedAt.toISOString(),
    finishedAtUtc: s.finishedAt?.toISOString() ?? null,
    items: s.answers.map((a) => {
      const answered = a.answeredAt !== null;
      return {
        questionId: a.questionId,
        order: a.sortOrder,
        stem: a.question.stem,
        options: a.question.options.map((o) => ({ optionId: o.id, text: o.text })),
        selectedOptionId: a.selectedOptionId,
        answered,
        isCorrect: answered ? a.isCorrect : null,
        correctOptionId: answered ? a.question.options.find((o) => o.isCorrect)?.id ?? null : null,
        explanation: answered ? a.question.explanation : null,
      };
    }),
  });
}

export async function answerPractice(input: {
  sessionId: string;
  dealerId: string;
  questionId: string;
  selectedOptionId: string;
}): Promise<Result<PracticeItem>> {
  if (!isGuid(input.sessionId) || !isGuid(input.questionId)) {
    return fail(404, "NOT_FOUND", "Không tìm thấy câu hỏi");
  }
  const session = await prisma.practiceSession.findFirst({
    where: { id: input.sessionId, dealerId: input.dealerId },
    select: { id: true, questionCount: true },
  });
  if (!session) return fail(404, "NOT_FOUND", "Không tìm thấy phiên ôn tập");

  const row = await prisma.practiceAnswer.findUnique({
    where: { sessionId_questionId: { sessionId: session.id, questionId: input.questionId } },
    select: {
      id: true,
      sortOrder: true,
      question: {
        select: {
          stem: true,
          explanation: true,
          options: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true, isCorrect: true } },
        },
      },
    },
  });
  if (!row) return fail(404, "NOT_FOUND", "Không tìm thấy câu hỏi");

  const option = row.question.options.find((o) => sameId(o.id, input.selectedOptionId));
  if (!option) return fail(422, "INVALID_OPTION", "Lựa chọn không thuộc câu hỏi này");

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const updated = await tx.practiceAnswer.updateMany({
      where: { id: row.id, answeredAt: null },
      data: { selectedOptionId: option.id, isCorrect: option.isCorrect, answeredAt: now },
    });
    if (updated.count === 0) return;
    const s = await tx.practiceSession.update({
      where: { id: session.id },
      data: {
        answeredCount: { increment: 1 },
        correctCount: { increment: option.isCorrect ? 1 : 0 },
      },
      select: { answeredCount: true, questionCount: true },
    });
    if (s.answeredCount >= s.questionCount) {
      await tx.practiceSession.update({ where: { id: session.id }, data: { finishedAt: now } });
    }
  });

  const saved = await prisma.practiceAnswer.findUnique({
    where: { id: row.id },
    select: { selectedOptionId: true, isCorrect: true },
  });

  return ok({
    questionId: input.questionId,
    order: row.sortOrder,
    stem: row.question.stem,
    options: row.question.options.map((o) => ({ optionId: o.id, text: o.text })),
    selectedOptionId: saved?.selectedOptionId ?? option.id,
    answered: true,
    isCorrect: saved?.isCorrect ?? option.isCorrect,
    correctOptionId: row.question.options.find((o) => o.isCorrect)?.id ?? null,
    explanation: row.question.explanation,
  });
}

export async function listPracticeHistory(dealerId: string, take = 20) {
  const rows = await prisma.practiceSession.findMany({
    where: { dealerId },
    orderBy: { startedAt: "desc" },
    take,
    select: {
      id: true,
      questionCount: true,
      answeredCount: true,
      correctCount: true,
      startedAt: true,
      finishedAt: true,
      category: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    sessionId: r.id,
    categoryName: r.category?.name ?? "Tất cả chủ đề",
    questionCount: r.questionCount,
    answeredCount: r.answeredCount,
    correctCount: r.correctCount,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  }));
}
