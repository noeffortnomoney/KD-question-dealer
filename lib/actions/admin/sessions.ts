"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assignSchema, resolveDealers, type AssignInput } from "@/lib/assign";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { formatDateTime, formatTime, parseDateTimeLocal } from "@/lib/date-utils";
import { isGuid, sameId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { notifyDealers, notifySafely, sessionDealerIds } from "@/lib/notifications";

function revalidateSession(id?: string) {
  revalidatePath("/admin/training-sessions");
  if (id) revalidatePath(`/admin/training-sessions/${id}`);
}

function newSessionPayload(s: { id: string; title: string; startsAt: Date; endsAt: Date }) {
  return {
    type: "session" as const,
    title: `Lịch training mới: ${s.title}`,
    body: `${formatDateTime(s.startsAt)} – ${formatTime(s.endsAt)}`,
    link: "/training-sessions",
    dedupeKey: `session-new:${s.id.toLowerCase()}`,
  };
}

const sessionSchema = z
  .object({
    title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(250),
    description: z.string().trim().max(4000).optional().default(""),
    presenterName: z.string().trim().max(200).optional().default(""),
    startsAt: z.string(),
    endsAt: z.string(),
    meetUrl: z
      .string()
      .trim()
      .url("Link Google Meet không hợp lệ")
      .refine((u) => /^https:\/\/meet\.google\.com\//i.test(u), "Link phải có dạng https://meet.google.com/…"),
  })
  .transform((v) => ({ ...v, start: parseDateTimeLocal(v.startsAt), end: parseDateTimeLocal(v.endsAt) }))
  .refine((v) => v.start && v.end, { message: "Thời gian không hợp lệ" })
  .refine((v) => !v.start || !v.end || v.end > v.start, { message: "Giờ kết thúc phải sau giờ bắt đầu" });

export type SessionInput = z.input<typeof sessionSchema>;

async function assignDealers(sessionId: string, input: AssignInput) {
  const { ids, missing } = await resolveDealers(input);
  const existing = await prisma.sessionAssignment.findMany({ where: { sessionId }, select: { dealerId: true } });
  const toAdd = ids.filter((id) => !existing.some((e) => sameId(e.dealerId, id)));
  if (toAdd.length) await prisma.sessionAssignment.createMany({ data: toAdd.map((dealerId) => ({ sessionId, dealerId })) });
  return { toAdd, missing };
}

function assignMessage(added: number, missing: string[]) {
  return `${added} đại lý được giao` + (missing.length ? `. Không tìm thấy: ${missing.slice(0, 10).join(", ")}` : "");
}

export async function createSessionAction(input: SessionInput, assign: AssignInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const assignParsed = assignSchema.safeParse(assign);
  if (!assignParsed.success) return { error: assignParsed.error.errors[0].message };
  const s = parsed.data;
  const session = await prisma.trainingSession.create({
    data: {
      title: s.title,
      description: s.description || null,
      presenterName: s.presenterName || null,
      startsAt: s.start!,
      endsAt: s.end!,
      meetUrl: s.meetUrl,
      createdById: g.userId,
    },
    select: { id: true, title: true, startsAt: true, endsAt: true },
  });
  const { toAdd, missing } = await assignDealers(session.id, assignParsed.data);
  await writeAudit({
    actorUserId: g.userId,
    action: "Session.Create",
    entityType: "TrainingSession",
    entityId: session.id,
    details: { title: s.title, assigned: toAdd.length, missing },
  });
  await notifySafely(() => notifyDealers(toAdd, newSessionPayload(session)));
  revalidateSession();
  return { success: true, id: session.id, message: `Đã tạo lịch training · ${assignMessage(toAdd.length, missing)}` };
}

export async function updateSessionAction(sessionId: string, input: SessionInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const s = parsed.data;
  const data = {
    title: s.title,
    description: s.description || null,
    presenterName: s.presenterName || null,
    startsAt: s.start!,
    endsAt: s.end!,
    meetUrl: s.meetUrl,
  };
  const updated = await prisma.trainingSession.update({ where: { id: sessionId }, data, select: { status: true } });
  await writeAudit({ actorUserId: g.userId, action: "Session.Update", entityType: "TrainingSession", entityId: sessionId, details: data });
  if (updated.status !== "cancelled") {
    await notifySafely(async () =>
      notifyDealers(await sessionDealerIds(sessionId), {
        type: "session",
        title: `Lịch training thay đổi: ${data.title}`,
        body: `${formatDateTime(data.startsAt)} – ${formatTime(data.endsAt)}`,
        link: "/training-sessions",
        dedupeKey: `session-update:${sessionId.toLowerCase()}:${Date.now()}`,
      })
    );
  }
  revalidateSession(sessionId);
  return { success: true, message: "Đã lưu lịch training" };
}

export async function setSessionStatusAction(sessionId: string, status: "scheduled" | "cancelled" | "completed") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const s = await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { status },
    select: { title: true, startsAt: true, endsAt: true },
  });
  await writeAudit({ actorUserId: g.userId, action: `Session.${status}`, entityType: "TrainingSession", entityId: sessionId });
  if (status !== "completed") {
    const cancelled = status === "cancelled";
    await notifySafely(async () =>
      notifyDealers(await sessionDealerIds(sessionId), {
        type: cancelled ? "session_cancel" : "session",
        title: cancelled ? `Buổi training bị hủy: ${s.title}` : `Buổi training được khôi phục: ${s.title}`,
        body: `${formatDateTime(s.startsAt)} – ${formatTime(s.endsAt)}`,
        link: "/training-sessions",
        dedupeKey: `session-${status}:${sessionId.toLowerCase()}:${Date.now()}`,
      })
    );
  }
  revalidateSession(sessionId);
  return { success: true, message: "Đã cập nhật" };
}

export async function assignSessionAction(sessionId: string, input: AssignInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, title: true, startsAt: true, endsAt: true, status: true },
  });
  if (!session) return { error: "Không tìm thấy buổi training" };
  const { toAdd, missing } = await assignDealers(sessionId, parsed.data);
  await writeAudit({
    actorUserId: g.userId,
    action: "Session.Assign",
    entityType: "TrainingSession",
    entityId: sessionId,
    details: { added: toAdd.length, missing },
  });
  if (session.status !== "cancelled") await notifySafely(() => notifyDealers(toAdd, newSessionPayload(session)));
  revalidateSession(sessionId);
  return { success: true, message: `Đã giao thêm ${toAdd.length} đại lý` + (missing.length ? `. Không tìm thấy: ${missing.slice(0, 10).join(", ")}` : "") };
}

export async function unassignSessionAction(sessionId: string, dealerId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId) || !isGuid(dealerId)) return { error: "Không tìm thấy" };
  await prisma.sessionAssignment.deleteMany({ where: { sessionId, dealerId } });
  await writeAudit({ actorUserId: g.userId, action: "Session.Unassign", entityType: "TrainingSession", entityId: sessionId, details: { dealerId } });
  revalidateSession(sessionId);
  return { success: true, message: "Đã bỏ giao" };
}

const linkSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề là bắt buộc").max(250),
  url: z.string().trim().url("Đường dẫn không hợp lệ").max(1000).refine((u) => /^https?:\/\//i.test(u), "Chỉ nhận http/https"),
});

export async function addLinkMaterialAction(sessionId: string, input: z.input<typeof linkSchema>) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const last = await prisma.sessionMaterial.findFirst({ where: { sessionId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await prisma.sessionMaterial.create({
    data: { sessionId, kind: "link", ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  await writeAudit({ actorUserId: g.userId, action: "Session.AddMaterial", entityType: "TrainingSession", entityId: sessionId, details: parsed.data });
  revalidateSession(sessionId);
  return { success: true, message: "Đã thêm tài liệu" };
}

export async function moveMaterialAction(materialId: string, move: "up" | "down") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(materialId)) return { error: "Không tìm thấy tài liệu" };
  const material = await prisma.sessionMaterial.findUnique({ where: { id: materialId }, select: { id: true, sessionId: true } });
  if (!material) return { error: "Không tìm thấy tài liệu" };
  const list = await prisma.sessionMaterial.findMany({
    where: { sessionId: material.sessionId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  const i = list.findIndex((m) => sameId(m.id, materialId));
  const j = move === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    await prisma.$transaction(list.map((m, idx) => prisma.sessionMaterial.update({ where: { id: m.id }, data: { sortOrder: idx + 1 } })));
  }
  revalidateSession(material.sessionId);
  return { success: true, message: "Đã cập nhật" };
}

export async function deleteMaterialAction(materialId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(materialId)) return { error: "Không tìm thấy tài liệu" };
  const material = await prisma.sessionMaterial.findUnique({ where: { id: materialId }, select: { sessionId: true, storageKey: true, title: true } });
  if (!material) return { error: "Không tìm thấy tài liệu" };
  await prisma.sessionMaterial.delete({ where: { id: materialId } });
  if (material.storageKey) await deleteFile(material.storageKey);
  await writeAudit({
    actorUserId: g.userId,
    action: "Session.DeleteMaterial",
    entityType: "TrainingSession",
    entityId: material.sessionId,
    details: { title: material.title },
  });
  revalidateSession(material.sessionId);
  return { success: true, message: "Đã xóa tài liệu" };
}
