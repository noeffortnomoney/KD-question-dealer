import { PrismaClient } from "@prisma/client";

export const TEST_SESSION_PREFIXES = ["E2E ", "Buổi test "];

export async function withDb<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupTestSessions() {
  return withDb(async (prisma) => {
    await prisma.notification.deleteMany({ where: { OR: [{ title: { contains: "E2E " } }, { body: { contains: "E2E " } }] } });
    const removed = await prisma.trainingSession.deleteMany({
      where: { OR: TEST_SESSION_PREFIXES.map((p) => ({ title: { startsWith: p } })) },
    });
    return removed.count;
  });
}

export async function createTestDealers(prefix: string, count: number) {
  return withDb(async (prisma) => {
    await prisma.dealer.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        code: `${prefix}${String(i + 1).padStart(3, "0")}`,
        name: `E2E đại lý phân trang ${i + 1}`,
        region: "E2E",
      })),
    });
  });
}

export async function cleanupTestDealers(prefix: string) {
  return withDb((prisma) => prisma.dealer.deleteMany({ where: { code: { startsWith: prefix }, users: { none: {} } } }));
}

export async function cleanupTestDealerAccounts(prefix: string) {
  return withDb(async (prisma) => {
    const dealers = await prisma.dealer.findMany({ where: { code: { startsWith: prefix } }, select: { id: true } });
    const dealerIds = dealers.map((d) => d.id);
    if (dealerIds.length === 0) return 0;
    const users = await prisma.user.findMany({ where: { dealerId: { in: dealerIds } }, select: { id: true } });
    const userIds = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    const removed = await prisma.dealer.deleteMany({ where: { id: { in: dealerIds } } });
    return removed.count;
  });
}

export async function createTestAdmin(email: string, password: string) {
  const { hashPassword } = await import("../lib/password");
  const passwordHash = await hashPassword(password);
  return withDb((prisma) =>
    prisma.user.upsert({
      where: { email },
      create: { email, name: "E2E quản trị viên phụ", role: "admin", passwordHash },
      update: { passwordHash, status: "active", mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
      select: { id: true },
    })
  );
}

export async function deleteTestUser(email: string) {
  return withDb(async (prisma) => {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return;
    await prisma.auditLog.deleteMany({ where: { actorUserId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
}

export async function cleanupTestQuestions() {
  return withDb(async (prisma) => {
    const removed = await prisma.question.deleteMany({ where: { stem: { startsWith: "E2E " }, examQuestions: { none: {} } } });
    await prisma.questionCategory.deleteMany({ where: { name: { startsWith: "E2E " }, questions: { none: {} } } });
    return removed.count;
  });
}

export async function cleanupTestExams() {
  return withDb(async (prisma) => {
    const exams = await prisma.exam.findMany({ where: { title: { startsWith: "E2E " } }, select: { id: true } });
    const ids = exams.map((e) => e.id);
    if (ids.length === 0) return 0;
    await prisma.attemptAnswer.deleteMany({ where: { attempt: { examId: { in: ids } } } });
    await prisma.attemptQuestion.deleteMany({ where: { attempt: { examId: { in: ids } } } });
    await prisma.examAttempt.deleteMany({ where: { examId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { title: { contains: "E2E " } } });
    const removed = await prisma.exam.deleteMany({ where: { id: { in: ids } } });
    return removed.count;
  });
}

export async function createRankingFixture(
  title: string,
  attempts: { email: string; score: number; minutes: number; status?: "Submitted" | "Voided" }[],
  assignedEmails: string[]
) {
  return withDb(async (prisma) => {
    const now = Date.now();
    const users = await prisma.user.findMany({
      where: { email: { in: assignedEmails } },
      select: { id: true, email: true, dealerId: true },
    });
    const exam = await prisma.exam.create({
      data: {
        title,
        status: "closed",
        startsAt: new Date(now - 3 * 86_400_000),
        endsAt: new Date(now - 86_400_000),
        showScorePolicy: "after_submit",
        showLeaderboard: true,
        assignments: { create: users.map((u) => ({ dealerId: u.dealerId! })) },
      },
      select: { id: true },
    });
    for (const [i, a] of attempts.entries()) {
      const u = users.find((x) => x.email === a.email)!;
      const startedAt = new Date(now - 2 * 86_400_000 + i * 60_000);
      const finishedAt = new Date(startedAt.getTime() + a.minutes * 60_000);
      const slot = `${exam.id}:${u.dealerId}`.toLowerCase();
      await prisma.examAttempt.create({
        data: {
          examId: exam.id,
          dealerId: u.dealerId!,
          userId: u.id,
          slotKey: a.status === "Voided" ? `${slot}:void:${i}` : slot,
          status: a.status ?? "Submitted",
          startedAt,
          deadlineAt: new Date(startedAt.getTime() + 45 * 60_000),
          submittedAt: finishedAt,
          finishedAt,
          totalQuestions: 30,
          correctCount: Math.round((a.score / 100) * 30),
          scorePercent: a.score,
          isPassed: a.score >= 70,
        },
      });
    }
    return exam.id;
  });
}

export async function createSessionFixture(opts: {
  dealerEmails: string[];
  sessions: { title: string; startOffsetMin: number; durationMin: number; meetUrl: string; materials?: { title: string; url: string }[] }[];
}) {
  return withDb(async (prisma) => {
    const users = await prisma.user.findMany({ where: { email: { in: opts.dealerEmails } }, select: { dealerId: true } });
    const now = Date.now();
    const ids: string[] = [];
    for (const s of opts.sessions) {
      const created = await prisma.trainingSession.create({
        data: {
          title: s.title,
          startsAt: new Date(now + s.startOffsetMin * 60_000),
          endsAt: new Date(now + (s.startOffsetMin + s.durationMin) * 60_000),
          meetUrl: s.meetUrl,
          assignments: { create: users.map((u) => ({ dealerId: u.dealerId! })) },
          materials: { create: (s.materials ?? []).map((m, i) => ({ ...m, kind: "link", sortOrder: i + 1 })) },
        },
        select: { id: true },
      });
      ids.push(created.id);
    }
    return ids;
  });
}
