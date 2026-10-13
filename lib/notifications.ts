import { prisma } from "@/lib/prisma";
import { formatDateTime, formatTime } from "@/lib/date-utils";
import { listDealerExams } from "@/lib/exam/engine";
import { GRACE_MS } from "@/lib/exam/policy";
import { isGuid, normId } from "@/lib/ids";
import { canJoinSession } from "@/lib/session-status";

export type NotificationType =
  | "session"
  | "session_cancel"
  | "exam"
  | "exam_result"
  | "reissue"
  | "reminder_session"
  | "reminder_exam"
  | "admin_alert";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  dedupeKey: string;
}

const CHUNK = 200;

export async function notifyUsers(userIds: string[], payload: NotificationPayload) {
  const unique = [...new Map(userIds.map((id) => [normId(id), id])).values()];
  if (unique.length === 0) return 0;
  let created = 0;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK);
    const existing = await prisma.notification.findMany({
      where: { dedupeKey: payload.dedupeKey, userId: { in: part } },
      select: { userId: true },
    });
    const have = new Set(existing.map((e) => normId(e.userId)));
    const rows = part
      .filter((id) => !have.has(normId(id)))
      .map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title.slice(0, 250),
        body: payload.body?.slice(0, 1000) ?? null,
        link: payload.link ?? null,
        dedupeKey: payload.dedupeKey.slice(0, 200),
      }));
    if (rows.length) {
      const res = await prisma.notification.createMany({ data: rows });
      created += res.count;
    }
  }
  return created;
}

export async function notifyDealers(dealerIds: string[], payload: NotificationPayload) {
  if (dealerIds.length === 0) return 0;
  const userIds: string[] = [];
  for (let i = 0; i < dealerIds.length; i += 1000) {
    const users = await prisma.user.findMany({
      where: { role: "dealer", status: "active", dealerId: { in: dealerIds.slice(i, i + 1000) } },
      select: { id: true },
    });
    userIds.push(...users.map((u) => u.id));
  }
  return notifyUsers(userIds, payload);
}

export async function notifyAdmins(payload: NotificationPayload) {
  const admins = await prisma.user.findMany({ where: { role: "admin", status: "active" }, select: { id: true } });
  return notifyUsers(
    admins.map((a) => a.id),
    payload
  );
}

export async function notifySafely(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    console.error("notification failed", error);
  }
}

export async function sessionDealerIds(sessionId: string) {
  const rows = await prisma.sessionAssignment.findMany({ where: { sessionId }, select: { dealerId: true } });
  return rows.map((r) => r.dealerId);
}

export async function examDealerIds(examId: string) {
  const rows = await prisma.examAssignment.findMany({ where: { examId }, select: { dealerId: true } });
  return rows.map((r) => r.dealerId);
}

const REMINDER_SESSION_MINUTES = 60;
const REMINDER_EXAM_HOURS = 24;

async function dealerReminders(userId: string, dealerId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_SESSION_MINUTES * 60_000);
  const sessions = await prisma.trainingSession.findMany({
    where: {
      status: "scheduled",
      startsAt: { lte: soon },
      endsAt: { gte: now },
      assignments: { some: { dealerId } },
      attendances: { none: { dealerId } },
    },
    select: { id: true, title: true, startsAt: true, endsAt: true, status: true },
  });
  for (const s of sessions) {
    const live = now >= s.startsAt;
    await notifyUsers([userId], {
      type: "reminder_session",
      title: live ? `Buổi training đang diễn ra: ${s.title}` : `Buổi training sắp bắt đầu: ${s.title}`,
      body: live
        ? `Diễn ra đến ${formatTime(s.endsAt)}. Bấm để vào Google Meet.`
        : `Bắt đầu lúc ${formatTime(s.startsAt)}.${canJoinSession(s, now) ? " Đã có thể tham gia." : ""}`,
      link: "/training-sessions",
      dedupeKey: `${live ? "session-live" : "session-soon"}:${s.id}`,
    });
  }

  const exams = await listDealerExams(dealerId);
  for (const e of exams) {
    if (e.state === "in_progress" && e.attemptId && e.deadlineAtUtc) {
      await notifyUsers([userId], {
        type: "reminder_exam",
        title: `Bạn đang làm dở: ${e.title}`,
        body: `Bài sẽ tự nộp lúc ${formatTime(e.deadlineAtUtc)}. Bấm để tiếp tục.`,
        link: `/attempts/${e.attemptId}`,
        dedupeKey: `exam-in-progress:${normId(e.attemptId)}`,
      });
    }
    if ((e.state === "can_start" || e.state === "reissued") && e.endsAtUtc) {
      const left = new Date(e.endsAtUtc).getTime() - now.getTime();
      if (left > 0 && left <= REMINDER_EXAM_HOURS * 3_600_000) {
        await notifyUsers([userId], {
          type: "reminder_exam",
          title: `Kỳ thi sắp đóng: ${e.title}`,
          body: `Đóng lúc ${formatDateTime(e.endsAtUtc)}. Bạn chưa làm bài.`,
          link: `/exams/${e.examId}`,
          dedupeKey: `exam-closing:${normId(e.examId)}`,
        });
      }
    }
  }
}

async function adminReminders(userId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + REMINDER_SESSION_MINUTES * 60_000);
  const sessions = await prisma.trainingSession.findMany({
    where: { status: "scheduled", startsAt: { lte: soon }, endsAt: { gte: now }, assignments: { some: {} } },
    select: { id: true, title: true, startsAt: true, endsAt: true, _count: { select: { assignments: true } } },
  });
  for (const s of sessions) {
    const live = now >= s.startsAt;
    await notifyUsers([userId], {
      type: "reminder_session",
      title: live ? `Đang diễn ra: ${s.title}` : `Sắp bắt đầu lúc ${formatTime(s.startsAt)}: ${s.title}`,
      body: `${s._count.assignments} đại lý được giao. Bấm để theo dõi điểm danh.`,
      link: `/admin/training-sessions/${s.id}`,
      dedupeKey: `${live ? "admin-session-live" : "admin-session-soon"}:${s.id}`,
    });
  }

  const ended = await prisma.exam.findMany({
    where: { status: "published", endsAt: { lt: now } },
    select: { id: true, title: true, endsAt: true },
  });
  for (const e of ended) {
    await notifyUsers([userId], {
      type: "admin_alert",
      title: `Kỳ thi đã hết hạn: ${e.title}`,
      body: `Hết hạn lúc ${formatDateTime(e.endsAt)}. Đóng kỳ thi để công bố đáp án và chốt kết quả.`,
      link: `/admin/exams/${e.id}`,
      dedupeKey: `admin-exam-ended:${e.id}`,
    });
  }

  const open = await prisma.exam.findMany({
    where: { status: "published", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    select: { id: true, title: true, questionCount: true },
  });
  for (const e of open) {
    const usable = await prisma.examQuestion.count({ where: { examId: e.id, question: { status: "published" } } });
    if (usable < e.questionCount) {
      await notifyUsers([userId], {
        type: "admin_alert",
        title: `Kỳ thi thiếu câu hỏi: ${e.title}`,
        body: `Chỉ còn ${usable}/${e.questionCount} câu đã xuất bản. Đại lý sẽ không bắt đầu thi được.`,
        link: `/admin/exams/${e.id}?tab=questions`,
        dedupeKey: `admin-exam-insufficient:${e.id}:${usable}`,
      });
    }
  }

  const stuck = await prisma.examAttempt.count({
    where: { status: "InProgress", deadlineAt: { lt: new Date(now.getTime() - GRACE_MS - 2 * 60_000) } },
  });
  if (stuck > 0) {
    const hour = now.toISOString().slice(0, 13);
    await notifyUsers([userId], {
      type: "admin_alert",
      title: `${stuck} lượt thi quá hạn chưa được đóng`,
      body: "Kiểm tra tác vụ định kỳ /api/cron/expire-attempts.",
      link: "/admin",
      dedupeKey: `admin-stuck:${hour}`,
    });
  }
}

export async function ensureReminders(user: { userId: string; role: string; dealerId: string | null }) {
  if (user.role === "admin") await adminReminders(user.userId);
  else if (user.dealerId) await dealerReminders(user.userId, user.dealerId);
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAtUtc: string;
  read: boolean;
}

export async function listNotifications(userId: string, take = 20, skip = 0) {
  const [items, unread, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: { id: true, type: true, title: true, body: true, link: true, createdAt: true, readAt: true },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.count({ where: { userId } }),
  ]);
  return {
    unread,
    total,
    items: items.map<NotificationItem>((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      createdAtUtc: n.createdAt.toISOString(),
      read: n.readAt !== null,
    })),
  };
}

export async function markRead(userId: string, ids: string[] | "all") {
  const where =
    ids === "all"
      ? { userId, readAt: null }
      : { userId, readAt: null, id: { in: ids.filter(isGuid).slice(0, 500) } };
  const res = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
  return res.count;
}
