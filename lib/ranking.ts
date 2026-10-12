import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/exam/grading";
import { hasExamEnded, visibility } from "@/lib/exam/policy";
import { ATTEMPT_STATUS } from "@/lib/exam/types";
import { isGuid, sameId } from "@/lib/ids";

export const PUBLIC_TOP = 10;

export interface RankInput {
  attemptId: string;
  dealerId: string;
  code: string;
  name: string;
  region: string | null;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  finishedAt: Date;
  isPassed: boolean;
}

export interface RankRow extends RankInput {
  rank: number;
}

export function rankRows(rows: RankInput[]): RankRow[] {
  const sorted = rows
    .slice()
    .sort(
      (a, b) =>
        b.scorePercent - a.scorePercent ||
        a.durationSeconds - b.durationSeconds ||
        a.finishedAt.getTime() - b.finishedAt.getTime() ||
        a.code.localeCompare(b.code)
    );
  let rank = 0;
  return sorted.map((r, i) => {
    const prev = sorted[i - 1];
    if (!prev || prev.scorePercent !== r.scorePercent || prev.durationSeconds !== r.durationSeconds) rank = i + 1;
    return { ...r, rank };
  });
}

export function topPercent(rank: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(1, Math.round((rank / total) * 100));
}

async function loadExam(examId: string) {
  if (!isGuid(examId)) return null;
  return prisma.exam.findUnique({
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
      showScorePolicy: true,
      showLeaderboard: true,
      _count: { select: { assignments: true } },
    },
  });
}

async function rankedAttempts(examId: string): Promise<RankInput[]> {
  const attempts = await prisma.examAttempt.findMany({
    where: { examId, status: { in: [ATTEMPT_STATUS.Submitted, ATTEMPT_STATUS.Expired] }, scorePercent: { not: null } },
    select: {
      id: true,
      startedAt: true,
      finishedAt: true,
      submittedAt: true,
      scorePercent: true,
      correctCount: true,
      totalQuestions: true,
      isPassed: true,
      dealer: { select: { id: true, code: true, name: true, region: true } },
    },
  });
  return attempts.map((a) => {
    const end = a.finishedAt ?? a.submittedAt ?? a.startedAt;
    return {
      attemptId: a.id,
      dealerId: a.dealer.id,
      code: a.dealer.code,
      name: a.dealer.name,
      region: a.dealer.region,
      scorePercent: a.scorePercent ?? 0,
      correctCount: a.correctCount ?? 0,
      totalQuestions: a.totalQuestions,
      durationSeconds: Math.max(0, Math.round((end.getTime() - a.startedAt.getTime()) / 1000)),
      finishedAt: end,
      isPassed: Boolean(a.isPassed),
    };
  });
}

export async function getExamRanking(examId: string, filters: { region?: string; q?: string } = {}) {
  const exam = await loadExam(examId);
  if (!exam) return null;
  const all = await rankedAttempts(examId);
  const regions = [...new Set(all.map((r) => r.region).filter((r): r is string => Boolean(r)))].sort();
  const scoped = filters.region ? all.filter((r) => r.region === filters.region) : all;
  const ranked = rankRows(scoped);
  const q = filters.q?.trim().toLowerCase();
  const rows = q ? ranked.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) : ranked;
  const passed = scoped.filter((r) => r.isPassed).length;
  return {
    exam,
    ended: hasExamEnded(exam, new Date()),
    regions,
    rows,
    stats: {
      assigned: exam._count.assignments,
      participants: scoped.length,
      passRate: scoped.length ? round2((passed / scoped.length) * 100) : 0,
      avgScore: scoped.length ? round2(scoped.reduce((s, r) => s + r.scorePercent, 0) / scoped.length) : 0,
      topScore: scoped.length ? Math.max(...scoped.map((r) => r.scorePercent)) : 0,
    },
  };
}

export type DealerRankingUnavailable = "not_found" | "not_ended" | "score_hidden" | "not_participated";

export async function getDealerRanking(examId: string, dealerId: string) {
  const exam = await loadExam(examId);
  if (!exam) return { ok: false as const, reason: "not_found" as DealerRankingUnavailable };
  const assigned = await prisma.examAssignment.findUnique({
    where: { examId_dealerId: { examId, dealerId } },
    select: { id: true },
  });
  const hasAttempt = await prisma.examAttempt.count({ where: { examId, dealerId } });
  if (!assigned && hasAttempt === 0) return { ok: false as const, reason: "not_found" as DealerRankingUnavailable };

  const now = new Date();
  const base = { title: exam.title, endsAt: exam.endsAt };
  if (!hasExamEnded(exam, now)) return { ok: false as const, reason: "not_ended" as DealerRankingUnavailable, exam: base };
  if (!visibility(exam.showScorePolicy, exam, now).visible) {
    return { ok: false as const, reason: "score_hidden" as DealerRankingUnavailable, exam: base };
  }

  const ranked = rankRows(await rankedAttempts(examId));
  const me = ranked.find((r) => sameId(r.dealerId, dealerId)) ?? null;
  if (!me) return { ok: false as const, reason: "not_participated" as DealerRankingUnavailable, exam: base };

  const myRegion = me.region ? rankRows(ranked.filter((r) => r.region === me.region)) : [];
  const meInRegion = myRegion.find((r) => sameId(r.dealerId, dealerId)) ?? null;

  return {
    ok: true as const,
    exam: { ...base, id: exam.id, passMarkPercent: exam.passMarkPercent, showLeaderboard: exam.showLeaderboard },
    total: ranked.length,
    me,
    topPercent: topPercent(me.rank, ranked.length),
    region: me.region && meInRegion ? { name: me.region, rank: meInRegion.rank, total: myRegion.length } : null,
    avgScore: ranked.length ? round2(ranked.reduce((s, r) => s + r.scorePercent, 0) / ranked.length) : 0,
    top: exam.showLeaderboard
      ? ranked.slice(0, PUBLIC_TOP).map((r) => ({
          rank: r.rank,
          name: r.name,
          region: r.region,
          scorePercent: r.scorePercent,
          durationSeconds: r.durationSeconds,
          isMe: sameId(r.dealerId, dealerId),
        }))
      : null,
  };
}
