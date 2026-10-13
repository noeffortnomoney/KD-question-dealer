import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/exam/grading";
import { GRACE_MS } from "@/lib/exam/policy";
import { getExamReport } from "@/lib/reports";

export async function getAdminDashboard() {
  const now = new Date();
  const dayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [activeDealers, lockedDealers, neverLoggedIn, upcomingSessions, openExams, finished, recentExams, stuck, sessionsSoon] =
    await Promise.all([
      prisma.dealer.count({ where: { status: "active" } }),
      prisma.dealer.count({ where: { status: "locked" } }),
      prisma.user.count({ where: { role: "dealer", status: "active", lastLoginAt: null } }),
      prisma.trainingSession.count({ where: { status: "scheduled", endsAt: { gte: now } } }),
      prisma.exam.findMany({
        where: { status: "published", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        select: { id: true, title: true, questionCount: true, startsAt: true },
        orderBy: { startsAt: "desc" },
      }),
      prisma.examAttempt.findMany({
        where: { status: { in: ["Submitted", "Expired"] } },
        select: { isPassed: true },
      }),
      prisma.exam.findMany({
        where: { status: { in: ["published", "closed"] } },
        orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          _count: { select: { assignments: true } },
          attempts: { where: { status: { in: ["Submitted", "Expired"] } }, select: { scorePercent: true, isPassed: true } },
        },
      }),
      prisma.examAttempt.count({ where: { status: "InProgress", deadlineAt: { lt: new Date(now.getTime() - GRACE_MS - 2 * 60_000) } } }),
      prisma.trainingSession.count({ where: { status: "scheduled", startsAt: { gte: now, lte: dayAhead } } }),
    ]);

  const passRate = finished.length ? round2((finished.filter((a) => a.isPassed).length / finished.length) * 100) : 0;

  const insufficient: string[] = [];
  for (const e of openExams) {
    const usable = await prisma.examQuestion.count({ where: { examId: e.id, question: { status: "published" } } });
    if (usable < e.questionCount) insufficient.push(e.title);
  }

  const focus = openExams[0] ?? recentExams[0] ?? null;
  const focusReport = focus ? await getExamReport(focus.id) : null;

  const examStats = recentExams
    .map((e) => {
      const n = e.attempts.length;
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        assigned: e._count.assignments,
        finished: n,
        avgScore: n ? round2(e.attempts.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / n) : null,
        passRate: n ? round2((e.attempts.filter((a) => a.isPassed).length / n) * 100) : null,
      };
    })
    .reverse();

  return {
    kpi: { activeDealers, lockedDealers, upcomingSessions, openExams: openExams.length, passRate, finishedAttempts: finished.length },
    participation: focusReport
      ? {
          examId: focusReport.exam.id,
          title: focusReport.exam.title,
          passed: focusReport.summary.passed,
          failed: focusReport.summary.failed,
          inProgress: focusReport.summary.inProgress,
          notStarted: focusReport.summary.notStarted,
          assigned: focusReport.summary.assigned,
        }
      : null,
    examStats,
    alerts: { stuck, insufficient, neverLoggedIn, sessionsSoon },
  };
}
