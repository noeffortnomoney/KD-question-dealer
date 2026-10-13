import { prisma } from "@/lib/prisma";
import { canJoinSession, sessionPhase } from "@/lib/session-status";

export { MEET_JOIN_EARLY_MINUTES, canJoinSession } from "@/lib/session-status";

export interface SessionMaterialLink {
  id: string;
  title: string;
  kind: string;
  fileName: string | null;
  href: string;
}

function toMaterialLink(m: { id: string; title: string; kind: string; url: string | null; fileName: string | null }): SessionMaterialLink {
  return {
    id: m.id,
    title: m.title,
    kind: m.kind,
    fileName: m.fileName,
    href: m.kind === "file" ? `/api/materials/${m.id}/download` : m.url ?? "#",
  };
}

function toDealerSession<T extends { status: string; startsAt: Date; endsAt: Date; meetUrl: string }>(
  s: T,
  joined: boolean,
  now: Date
) {
  const { meetUrl, ...rest } = s;
  const canJoin = canJoinSession(s, now);
  return {
    ...rest,
    canJoin,
    joinUrl: canJoin ? meetUrl : null,
    phase: sessionPhase(s, now),
    joined,
    past: s.endsAt < now,
  };
}

export async function getDealerSessions(dealerId: string, scope: "upcoming" | "past" | "all") {
  const now = new Date();
  const sessions = await prisma.trainingSession.findMany({
    where: {
      status: { not: "cancelled" },
      assignments: { some: { dealerId } },
      ...(scope === "upcoming" ? { endsAt: { gte: now } } : scope === "past" ? { endsAt: { lt: now } } : {}),
    },
    orderBy: { startsAt: scope === "past" ? "desc" : "asc" },
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      presenterName: true,
      startsAt: true,
      endsAt: true,
      status: true,
      meetUrl: true,
      materials: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, kind: true, url: true, fileName: true },
      },
      attendances: { where: { dealerId }, select: { joinedAt: true } },
    },
  });
  return sessions.map(({ attendances, materials, ...s }) => ({
    ...toDealerSession(s, attendances.length > 0, now),
    materials: materials.map(toMaterialLink),
  }));
}

export async function countDealerAttended(dealerId: string) {
  return prisma.attendance.count({ where: { dealerId } });
}
