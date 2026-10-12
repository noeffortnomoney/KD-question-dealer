import { prisma } from "@/lib/prisma";
import { isGuid, sameId } from "@/lib/ids";
import { canJoinSession, sessionPhase } from "@/lib/session-status";

export { MEET_JOIN_EARLY_MINUTES, canJoinSession } from "@/lib/session-status";

export interface CourseCard {
  id: string;
  title: string;
  description: string | null;
  materialCount: number;
  sessionCount: number;
  completedMaterials: number;
  percent: number;
  completed: boolean;
  nextSessionAt: Date | null;
}

function progressOf(
  materials: { id: string; isRequired: boolean }[],
  done: { materialId: string; completedAt: Date | null }[]
) {
  const isDone = (id: string) => done.some((p) => sameId(p.materialId, id) && p.completedAt);
  const completedMaterials = materials.filter((m) => isDone(m.id)).length;
  const required = materials.filter((m) => m.isRequired);
  const completed =
    materials.length > 0 && (required.length > 0 ? required.every((m) => isDone(m.id)) : completedMaterials === materials.length);
  const percent = materials.length ? Math.round((completedMaterials / materials.length) * 100) : 0;
  return { completedMaterials, completed, percent };
}

export async function getDealerCourses(dealerId: string): Promise<CourseCard[]> {
  const now = new Date();
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { dealerId, course: { status: "published" } },
    orderBy: { enrolledAt: "desc" },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          materials: { select: { id: true, isRequired: true } },
          sessions: {
            where: { status: "scheduled" },
            select: { startsAt: true, endsAt: true },
            orderBy: { startsAt: "asc" },
          },
        },
      },
    },
  });
  const progress = await prisma.materialProgress.findMany({
    where: { dealerId },
    select: { materialId: true, completedAt: true },
  });
  return enrollments.map(({ course }) => {
    const p = progressOf(course.materials, progress);
    const next = course.sessions.find((s) => s.endsAt > now);
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      materialCount: course.materials.length,
      sessionCount: course.sessions.length,
      ...p,
      nextSessionAt: next?.startsAt ?? null,
    };
  });
}

export async function getCourseForDealer(courseId: string, dealerId: string) {
  if (!isGuid(courseId)) return null;
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { courseId_dealerId: { courseId, dealerId } },
    select: { completedAt: true },
  });
  if (!enrollment) return null;
  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "published" },
    select: {
      id: true,
      title: true,
      description: true,
      materials: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, title: true, kind: true, url: true, fileName: true, isRequired: true },
      },
      sessions: {
        where: { status: { not: "cancelled" } },
        orderBy: { startsAt: "asc" },
        select: { id: true, title: true, presenterName: true, startsAt: true, endsAt: true, status: true, meetUrl: true },
      },
    },
  });
  if (!course) return null;
  const progress = await prisma.materialProgress.findMany({
    where: { dealerId, materialId: { in: course.materials.map((m) => m.id) } },
    select: { materialId: true, completedAt: true, firstViewedAt: true },
  });
  const attendance = await prisma.attendance.findMany({
    where: { dealerId, sessionId: { in: course.sessions.map((s) => s.id) } },
    select: { sessionId: true, joinedAt: true },
  });
  const now = new Date();
  return {
    ...course,
    ...progressOf(course.materials, progress),
    materials: course.materials.map((m) => {
      const p = progress.find((x) => sameId(x.materialId, m.id));
      return { ...m, viewed: Boolean(p), completedAt: p?.completedAt ?? null };
    }),
    sessions: course.sessions.map((s) => toDealerSession(s, attendance.some((a) => sameId(a.sessionId, s.id)), now)),
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
      course: { status: "published", enrollments: { some: { dealerId } } },
      ...(scope === "upcoming" ? { endsAt: { gte: now } } : scope === "past" ? { endsAt: { lt: now } } : {}),
    },
    orderBy: { startsAt: scope === "past" ? "desc" : "asc" },
    take: 100,
    select: {
      id: true,
      title: true,
      presenterName: true,
      startsAt: true,
      endsAt: true,
      status: true,
      meetUrl: true,
      course: { select: { id: true, title: true } },
      attendances: { where: { dealerId }, select: { joinedAt: true } },
    },
  });
  return sessions.map(({ attendances, ...s }) => toDealerSession(s, attendances.length > 0, now));
}
