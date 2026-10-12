import { prisma, isUniqueViolation } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { fail, ok, type Result } from "@/lib/http";
import { isGuid, sameId } from "@/lib/ids";
import { gradeAttempt, isPassed } from "@/lib/exam/grading";
import {
  GRACE_MS,
  computeDeadline,
  dealerExamState,
  hasExamEnded,
  isExamOpen,
  isOverdue,
  slotKeyFor,
  visibility,
  voidedSlotKey,
} from "@/lib/exam/policy";
import { pickQuestions } from "@/lib/exam/select";
import { buildSnapshot, parseSnapshot, toExamQuestionDto } from "@/lib/exam/snapshot";
import {
  ATTEMPT_STATUS,
  type AttemptStatus,
  type AttemptView,
  type DealerExamState,
  type FinalStatus,
  type ResultView,
} from "@/lib/exam/types";

export interface DealerContext {
  userId: string;
  dealerId: string;
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

async function loadAttemptView(attemptId: string): Promise<AttemptView | null> {
  const a = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      totalQuestions: true,
      exam: { select: { title: true } },
      questions: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true, snapshot: true } },
      answers: { select: { attemptQuestionId: true, selectedOptionId: true, version: true } },
    },
  });
  if (!a) return null;

  const view: AttemptView = {
    attemptId: a.id,
    examId: a.examId,
    title: a.exam.title,
    status: a.status as AttemptStatus,
    startedAtUtc: a.startedAt.toISOString(),
    deadlineAtUtc: a.deadlineAt.toISOString(),
    serverNowUtc: new Date().toISOString(),
    totalQuestions: a.totalQuestions,
  };

  if (a.status === ATTEMPT_STATUS.InProgress) {
    view.questions = a.questions.map((q) => {
      const answer = a.answers.find((x) => sameId(x.attemptQuestionId, q.id));
      return toExamQuestionDto({
        attemptQuestionId: q.id,
        order: q.sortOrder,
        snapshot: parseSnapshot(q.snapshot),
        selectedOptionId: answer?.selectedOptionId ?? null,
        version: answer?.version ?? 0,
      });
    });
  }
  return view;
}

export async function finalizeAttempt(attemptId: string, target: FinalStatus): Promise<boolean> {
  const now = new Date();
  return prisma.$transaction(
    async (tx) => {
      const flipped = await tx.examAttempt.updateMany({
        where: { id: attemptId, status: ATTEMPT_STATUS.InProgress },
        data: {
          status: target,
          submittedAt: target === ATTEMPT_STATUS.Submitted ? now : null,
          finishedAt: now,
        },
      });
      if (flipped.count === 0) return false;

      const a = await tx.examAttempt.findUnique({
        where: { id: attemptId },
        select: {
          exam: { select: { passMarkPercent: true } },
          questions: { select: { id: true, points: true, snapshot: true } },
          answers: { select: { attemptQuestionId: true, selectedOptionId: true } },
        },
      });
      if (!a) return false;

      const g = gradeAttempt(
        a.questions.map((q) => ({ attemptQuestionId: q.id, points: q.points, snapshot: parseSnapshot(q.snapshot) })),
        a.answers
      );
      await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          correctCount: g.correctCount,
          scorePercent: g.scorePercent,
          isPassed: isPassed(g.scorePercent, a.exam.passMarkPercent),
        },
      });
      return true;
    },
    { timeout: 15_000 }
  );
}

async function closeIfOverdue(attempt: { id: string; status: string; deadlineAt: Date }, now: Date) {
  if (attempt.status === ATTEMPT_STATUS.InProgress && isOverdue(attempt.deadlineAt, now)) {
    await finalizeAttempt(attempt.id, ATTEMPT_STATUS.Expired);
    return true;
  }
  return false;
}

export async function startAttempt(examId: string, ctx: DealerContext): Promise<Result<AttemptView>> {
  if (!isGuid(examId)) return fail(404, "NOT_FOUND", "Không tìm thấy kỳ thi");
  const now = new Date();

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      questionCount: true,
      durationMinutes: true,
      selectionMode: true,
      shuffleOptions: true,
      assignments: { where: { dealerId: ctx.dealerId }, select: { id: true } },
    },
  });
  if (!exam || exam.status === "draft") return fail(404, "NOT_FOUND", "Không tìm thấy kỳ thi");
  if (exam.assignments.length === 0) return fail(403, "EXAM_NOT_ASSIGNED", "Bạn không được giao kỳ thi này");

  const existing = await prisma.examAttempt.findFirst({
    where: { examId, dealerId: ctx.dealerId, status: { not: ATTEMPT_STATUS.Voided } },
    select: { id: true, status: true, deadlineAt: true },
  });
  if (existing) {
    if (existing.status === ATTEMPT_STATUS.InProgress && !(await closeIfOverdue(existing, now))) {
      const view = await loadAttemptView(existing.id);
      if (view) return ok(view, 200);
    }
    return fail(409, "ATTEMPT_ALREADY_USED", "Bạn đã sử dụng lượt thi chính thức của kỳ thi này");
  }

  if (!isExamOpen(exam, now)) return fail(409, "EXAM_NOT_OPEN", "Kỳ thi chưa mở hoặc đã đóng");

  const pool = await prisma.examQuestion.findMany({
    where: { examId, question: { status: "published" } },
    orderBy: { sortOrder: "asc" },
    select: {
      question: {
        select: {
          id: true,
          version: true,
          stem: true,
          explanation: true,
          options: { select: { id: true, text: true, isCorrect: true, sortOrder: true } },
        },
      },
    },
  });
  const usable = pool
    .map((p) => p.question)
    .filter((q) => q.options.length >= 2 && q.options.filter((o) => o.isCorrect).length === 1);
  const picked = pickQuestions(usable, exam.questionCount, exam.selectionMode === "fixed" ? "fixed" : "random");
  if (picked.length === 0) {
    return fail(409, "EXAM_INSUFFICIENT_QUESTIONS", "Kỳ thi chưa đủ câu hỏi đã xuất bản");
  }

  const previous = await prisma.examAttempt.count({ where: { examId, dealerId: ctx.dealerId } });
  const deadlineAt = computeDeadline(now, exam.durationMinutes, exam.endsAt);

  try {
    const created = await prisma.examAttempt.create({
      data: {
        examId,
        dealerId: ctx.dealerId,
        userId: ctx.userId,
        slotKey: slotKeyFor(examId, ctx.dealerId),
        attemptNo: previous + 1,
        status: ATTEMPT_STATUS.InProgress,
        startedAt: now,
        deadlineAt,
        totalQuestions: picked.length,
        questions: {
          create: picked.map((q, i) => ({
            questionId: q.id,
            sortOrder: i + 1,
            points: 1,
            snapshot: JSON.stringify(buildSnapshot(q, exam.shuffleOptions)),
          })),
        },
      },
      select: { id: true },
    });
    const view = await loadAttemptView(created.id);
    if (!view) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
    return ok(view, 201);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const winner = await prisma.examAttempt.findFirst({
      where: { examId, dealerId: ctx.dealerId, status: ATTEMPT_STATUS.InProgress },
      select: { id: true },
    });
    const view = winner ? await loadAttemptView(winner.id) : null;
    if (view) return ok(view, 200);
    return fail(409, "ATTEMPT_ALREADY_USED", "Bạn đã sử dụng lượt thi chính thức của kỳ thi này");
  }
}

export async function getAttemptForDealer(attemptId: string, dealerId: string): Promise<Result<AttemptView>> {
  if (!isGuid(attemptId)) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, dealerId },
    select: { id: true, status: true, deadlineAt: true },
  });
  if (!attempt) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  await closeIfOverdue(attempt, new Date());
  const view = await loadAttemptView(attempt.id);
  if (!view) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  return ok(view);
}

export interface SaveAnswerInput {
  attemptId: string;
  dealerId: string;
  attemptQuestionId: string;
  selectedOptionId: string | null;
  clientSeq: number;
}

export interface SaveAnswerOutput {
  attemptQuestionId: string;
  selectedOptionId: string | null;
  version: number;
  savedAtUtc: string;
  serverNowUtc: string;
}

const closedError = () => fail(409, "ATTEMPT_CLOSED", "Bài thi đã kết thúc");

export async function saveAnswer(input: SaveAnswerInput): Promise<Result<SaveAnswerOutput>> {
  const { attemptId, dealerId, attemptQuestionId, clientSeq } = input;
  if (!isGuid(attemptId) || !isGuid(attemptQuestionId)) return fail(404, "NOT_FOUND", "Không tìm thấy câu hỏi");
  const now = new Date();

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, dealerId },
    select: { id: true, status: true, deadlineAt: true },
  });
  if (!attempt) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  if (attempt.status !== ATTEMPT_STATUS.InProgress) return closedError();
  if (await closeIfOverdue(attempt, now)) return closedError();

  const aq = await prisma.attemptQuestion.findFirst({
    where: { id: attemptQuestionId, attemptId },
    select: { snapshot: true },
  });
  if (!aq) return fail(404, "NOT_FOUND", "Không tìm thấy câu hỏi");

  let selectedOptionId: string | null = null;
  if (input.selectedOptionId !== null) {
    const option = parseSnapshot(aq.snapshot).options.find((o) => sameId(o.id, input.selectedOptionId));
    if (!option) return fail(422, "INVALID_OPTION", "Lựa chọn không thuộc câu hỏi này");
    selectedOptionId = option.id;
  }

  const minDeadline = new Date(now.getTime() - GRACE_MS);
  const saved = await prisma.$transaction(async (tx) => {
    const locked = await tx.examAttempt.updateMany({
      where: { id: attemptId, dealerId, status: ATTEMPT_STATUS.InProgress, deadlineAt: { gte: minDeadline } },
      data: { lastActivityAt: now },
    });
    if (locked.count === 0) return null;

    const existing = await tx.attemptAnswer.findUnique({
      where: { attemptId_attemptQuestionId: { attemptId, attemptQuestionId } },
    });
    if (!existing) {
      return tx.attemptAnswer.create({
        data: { attemptId, attemptQuestionId, selectedOptionId, version: clientSeq, updatedAt: now },
      });
    }
    if (existing.version >= clientSeq) return existing;
    return tx.attemptAnswer.update({
      where: { id: existing.id },
      data: { selectedOptionId, version: clientSeq, updatedAt: now },
    });
  });

  if (!saved) return closedError();
  return ok({
    attemptQuestionId,
    selectedOptionId: saved.selectedOptionId,
    version: saved.version,
    savedAtUtc: saved.updatedAt.toISOString(),
    serverNowUtc: new Date().toISOString(),
  });
}

async function buildResultView(attemptId: string, now: Date): Promise<ResultView | null> {
  const a = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      finishedAt: true,
      totalQuestions: true,
      correctCount: true,
      scorePercent: true,
      isPassed: true,
      exam: {
        select: {
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          passMarkPercent: true,
          showScorePolicy: true,
          showAnswerPolicy: true,
        },
      },
      questions: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true, snapshot: true } },
      answers: { select: { attemptQuestionId: true, selectedOptionId: true } },
    },
  });
  if (!a) return null;

  const graded = a.status === ATTEMPT_STATUS.Submitted || a.status === ATTEMPT_STATUS.Expired;
  const scorePolicy = visibility(a.exam.showScorePolicy, a.exam, now);
  const answerPolicy = visibility(a.exam.showAnswerPolicy, a.exam, now);
  const end = a.finishedAt ?? a.submittedAt;

  const view: ResultView = {
    attemptId: a.id,
    examId: a.examId,
    examTitle: a.exam.title,
    status: a.status as AttemptStatus,
    startedAtUtc: a.startedAt.toISOString(),
    submittedAtUtc: iso(a.submittedAt),
    finishedAtUtc: iso(a.finishedAt),
    durationSeconds: end ? Math.round((end.getTime() - a.startedAt.getTime()) / 1000) : null,
    answeredCount: a.answers.filter((x) => x.selectedOptionId !== null).length,
    totalQuestions: a.totalQuestions,
    score: { visible: graded && scorePolicy.visible, availableAtUtc: iso(scorePolicy.availableAt) },
    answers: { visible: graded && answerPolicy.visible, availableAtUtc: iso(answerPolicy.availableAt) },
  };

  if (view.score.visible) {
    view.score.correct = a.correctCount ?? 0;
    view.score.total = a.totalQuestions;
    view.score.scorePercent = a.scorePercent ?? 0;
    view.score.passMarkPercent = a.exam.passMarkPercent;
    view.score.isPassed = Boolean(a.isPassed);
  }

  if (view.answers.visible) {
    view.answers.items = a.questions.map((q) => {
      const s = parseSnapshot(q.snapshot);
      const answer = a.answers.find((x) => sameId(x.attemptQuestionId, q.id));
      return {
        order: q.sortOrder,
        stem: s.stem,
        options: s.options.map((o) => ({ optionId: o.id, text: o.text })),
        selectedOptionId: answer?.selectedOptionId ?? null,
        correctOptionId: s.correctOptionId,
        explanation: s.explanation,
      };
    });
  }
  return view;
}

export interface SubmitOutput {
  attemptId: string;
  status: AttemptStatus;
  submittedAtUtc: string | null;
  answeredCount: number;
  totalQuestions: number;
  result: { visible: boolean; scorePercent?: number; isPassed?: boolean; availableAtUtc: string | null };
}

export async function submitAttempt(attemptId: string, dealerId: string): Promise<Result<SubmitOutput>> {
  if (!isGuid(attemptId)) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  const now = new Date();
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, dealerId },
    select: { id: true, status: true, deadlineAt: true },
  });
  if (!attempt) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  if (attempt.status === ATTEMPT_STATUS.Voided) return closedError();

  if (attempt.status === ATTEMPT_STATUS.InProgress) {
    const target = isOverdue(attempt.deadlineAt, now) ? ATTEMPT_STATUS.Expired : ATTEMPT_STATUS.Submitted;
    await finalizeAttempt(attempt.id, target);
  }

  const view = await buildResultView(attempt.id, now);
  if (!view) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  return ok({
    attemptId: view.attemptId,
    status: view.status,
    submittedAtUtc: view.submittedAtUtc,
    answeredCount: view.answeredCount,
    totalQuestions: view.totalQuestions,
    result: {
      visible: view.score.visible,
      scorePercent: view.score.scorePercent,
      isPassed: view.score.isPassed,
      availableAtUtc: view.score.availableAtUtc,
    },
  });
}

export async function getResultForDealer(attemptId: string, dealerId: string): Promise<Result<ResultView>> {
  if (!isGuid(attemptId)) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  const now = new Date();
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, dealerId },
    select: { id: true, status: true, deadlineAt: true },
  });
  if (!attempt) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  const closedNow = await closeIfOverdue(attempt, now);
  if (attempt.status === ATTEMPT_STATUS.InProgress && !closedNow) {
    return fail(409, "ATTEMPT_IN_PROGRESS", "Bài thi đang diễn ra");
  }
  const view = await buildResultView(attempt.id, now);
  if (!view) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  return ok(view);
}

export async function expireOverdueAttempts(limit = 100) {
  const cutoff = new Date(Date.now() - GRACE_MS);
  const due = await prisma.examAttempt.findMany({
    where: { status: ATTEMPT_STATUS.InProgress, deadlineAt: { lt: cutoff } },
    orderBy: { deadlineAt: "asc" },
    select: { id: true },
    take: limit,
  });
  let expired = 0;
  for (const a of due) {
    if (await finalizeAttempt(a.id, ATTEMPT_STATUS.Expired)) expired += 1;
  }
  return { scanned: due.length, expired };
}

export async function reissueAttempt(input: {
  attemptId: string;
  adminUserId: string;
  reason: string;
  reasonCategory: string;
}): Promise<Result<{ attemptId: string }>> {
  if (!isGuid(input.attemptId)) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
  return prisma.$transaction(async (tx) => {
    const before = await tx.examAttempt.findUnique({
      where: { id: input.attemptId },
      select: {
        id: true,
        examId: true,
        dealerId: true,
        slotKey: true,
        status: true,
        attemptNo: true,
        scorePercent: true,
        isPassed: true,
      },
    });
    if (!before) return fail(404, "NOT_FOUND", "Không tìm thấy lượt thi");
    if (before.status === ATTEMPT_STATUS.Voided) return fail(409, "CONFLICT", "Lượt thi này đã được hủy trước đó");

    const now = new Date();
    await tx.examAttempt.update({
      where: { id: before.id },
      data: {
        status: ATTEMPT_STATUS.Voided,
        slotKey: voidedSlotKey(before.slotKey, before.id),
        voidReason: input.reason,
        voidReasonCategory: input.reasonCategory,
        voidedAt: now,
        voidedById: input.adminUserId,
        finishedAt: before.status === ATTEMPT_STATUS.InProgress ? now : undefined,
      },
    });
    await writeAudit(
      {
        actorUserId: input.adminUserId,
        action: "Attempt.Reissue",
        entityType: "ExamAttempt",
        entityId: before.id,
        details: {
          before,
          after: { status: ATTEMPT_STATUS.Voided },
          reason: input.reason,
          reasonCategory: input.reasonCategory,
        },
      },
      tx
    );
    return ok({ attemptId: before.id });
  });
}

export interface DealerExamItem {
  examId: string;
  title: string;
  description: string | null;
  questionCount: number;
  durationMinutes: number;
  passMarkPercent: number;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  state: DealerExamState;
  attemptId: string | null;
  deadlineAtUtc: string | null;
  score: { visible: boolean; scorePercent: number | null; isPassed: boolean | null };
  rankingAvailable: boolean;
}

export async function listDealerExams(dealerId: string, examId?: string): Promise<DealerExamItem[]> {
  const now = new Date();
  const assignments = await prisma.examAssignment.findMany({
    where: {
      dealerId,
      exam: { status: { in: ["published", "closed"] } },
      ...(examId ? { examId } : {}),
    },
    orderBy: { assignedAt: "desc" },
    select: {
      exam: {
        select: {
          id: true,
          title: true,
          description: true,
          questionCount: true,
          durationMinutes: true,
          passMarkPercent: true,
          startsAt: true,
          endsAt: true,
          status: true,
          showScorePolicy: true,
        },
      },
    },
  });
  if (assignments.length === 0) return [];

  const attempts = await prisma.examAttempt.findMany({
    where: { dealerId, examId: { in: assignments.map((x) => x.exam.id) } },
    orderBy: { attemptNo: "desc" },
    select: { id: true, examId: true, status: true, deadlineAt: true, scorePercent: true, isPassed: true },
  });

  return assignments.map(({ exam }) => {
    const mine = attempts.filter((a) => sameId(a.examId, exam.id));
    const active = mine.find((a) => a.status !== ATTEMPT_STATUS.Voided) ?? null;
    const hasVoided = mine.some((a) => a.status === ATTEMPT_STATUS.Voided);
    const state = dealerExamState(exam, active, hasVoided, now);
    const scoreVisible =
      state === "finished" && active !== null && visibility(exam.showScorePolicy, exam, now).visible;
    return {
      examId: exam.id,
      title: exam.title,
      description: exam.description,
      questionCount: exam.questionCount,
      durationMinutes: exam.durationMinutes,
      passMarkPercent: exam.passMarkPercent,
      startsAtUtc: iso(exam.startsAt),
      endsAtUtc: iso(exam.endsAt),
      state,
      attemptId: active?.id ?? null,
      deadlineAtUtc: state === "in_progress" && active ? active.deadlineAt.toISOString() : null,
      score: {
        visible: scoreVisible,
        scorePercent: scoreVisible ? active?.scorePercent ?? null : null,
        isPassed: scoreVisible ? active?.isPassed ?? null : null,
      },
      rankingAvailable:
        scoreVisible &&
        active !== null &&
        (active.status === ATTEMPT_STATUS.Submitted || active.status === ATTEMPT_STATUS.Expired) &&
        hasExamEnded(exam, now),
    };
  });
}
