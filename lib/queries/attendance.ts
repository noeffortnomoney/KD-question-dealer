import { prisma } from "@/lib/prisma";
import { isGuid, normId } from "@/lib/ids";
import { sessionPhase } from "@/lib/session-status";

export type AttendanceFilter = "all" | "joined" | "missing";

export interface AttendanceRow {
  dealerId: string;
  code: string;
  name: string;
  region: string | null;
  userName: string | null;
  email: string | null;
  joinedAt: Date | null;
}

export async function getSessionAttendance(sessionId: string, filter: AttendanceFilter = "all", q = "") {
  if (!isGuid(sessionId)) return null;
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      presenterName: true,
      startsAt: true,
      endsAt: true,
      status: true,
      meetUrl: true,
      course: { select: { id: true, title: true, status: true } },
    },
  });
  if (!session) return null;

  const [enrollments, attendances] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { courseId: session.course.id },
      select: {
        dealer: {
          select: { id: true, code: true, name: true, region: true, users: { select: { name: true, email: true }, take: 1 } },
        },
      },
    }),
    prisma.attendance.findMany({
      where: { sessionId },
      select: {
        joinedAt: true,
        dealer: {
          select: { id: true, code: true, name: true, region: true, users: { select: { name: true, email: true }, take: 1 } },
        },
      },
    }),
  ]);

  const byDealer = new Map<string, AttendanceRow>();
  for (const { dealer } of enrollments) {
    byDealer.set(normId(dealer.id), {
      dealerId: dealer.id,
      code: dealer.code,
      name: dealer.name,
      region: dealer.region,
      userName: dealer.users[0]?.name ?? null,
      email: dealer.users[0]?.email ?? null,
      joinedAt: null,
    });
  }
  for (const a of attendances) {
    const key = normId(a.dealer.id);
    const existing = byDealer.get(key);
    byDealer.set(key, {
      dealerId: a.dealer.id,
      code: a.dealer.code,
      name: a.dealer.name,
      region: a.dealer.region,
      userName: a.dealer.users[0]?.name ?? null,
      email: a.dealer.users[0]?.email ?? null,
      ...existing,
      joinedAt: a.joinedAt,
    });
  }

  const all = [...byDealer.values()].sort((x, y) => {
    if (x.joinedAt && y.joinedAt) return x.joinedAt.getTime() - y.joinedAt.getTime();
    if (x.joinedAt) return -1;
    if (y.joinedAt) return 1;
    return x.code.localeCompare(y.code);
  });

  const joined = all.filter((r) => r.joinedAt).length;
  const query = q.trim().toLowerCase();
  const rows = all.filter((r) => {
    if (filter === "joined" && !r.joinedAt) return false;
    if (filter === "missing" && r.joinedAt) return false;
    if (query && ![r.code, r.name, r.userName ?? "", r.email ?? ""].some((v) => v.toLowerCase().includes(query))) return false;
    return true;
  });

  return {
    session: { ...session, phase: sessionPhase(session) },
    summary: {
      assigned: enrollments.length,
      joined,
      missing: all.length - joined,
      rate: enrollments.length ? Math.round((joined / enrollments.length) * 1000) / 10 : 0,
    },
    rows,
  };
}
