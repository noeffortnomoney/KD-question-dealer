"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assignSchema, resolveDealers, type AssignInput } from "@/lib/assign";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { parseDateTimeLocal } from "@/lib/date-utils";
import { isGuid, sameId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { formatDateTime, formatTime } from "@/lib/date-utils";
import { courseDealerIds, notifyDealers, notifySafely, type NotificationPayload } from "@/lib/notifications";

function coursePayload(course: { id: string; title: string }): NotificationPayload {
  return {
    type: "course",
    title: `Khóa học mới: ${course.title}`,
    body: "Bạn được giao khóa đào tạo này. Bấm để xem tài liệu và lịch training.",
    link: `/courses/${course.id}`,
    dedupeKey: `course:${course.id.toLowerCase()}`,
  };
}

function revalidateCourse(id?: string) {
  revalidatePath("/admin/courses");
  revalidatePath("/admin/training-sessions");
  if (id) revalidatePath(`/admin/courses/${id}`);
}

const courseSchema = z.object({
  title: z.string().trim().min(3, "Tên khóa học tối thiểu 3 ký tự").max(250),
  description: z.string().trim().max(4000).optional().default(""),
});

export async function saveCourseAction(id: string | null, input: z.input<typeof courseSchema>) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const data = { title: parsed.data.title, description: parsed.data.description || null };
  if (!id) {
    const course = await prisma.course.create({ data: { ...data, createdById: g.userId } });
    await writeAudit({ actorUserId: g.userId, action: "Course.Create", entityType: "Course", entityId: course.id });
    revalidateCourse();
    return { success: true, id: course.id };
  }
  if (!isGuid(id)) return { error: "Không tìm thấy khóa học" };
  await prisma.course.update({ where: { id }, data });
  await writeAudit({ actorUserId: g.userId, action: "Course.Update", entityType: "Course", entityId: id, details: data });
  revalidateCourse(id);
  return { success: true, id };
}

export async function setCourseStatusAction(id: string, status: "draft" | "published" | "archived") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(id)) return { error: "Không tìm thấy khóa học" };
  const course = await prisma.course.update({
    where: { id },
    data: { status, publishedAt: status === "published" ? new Date() : undefined },
    select: { id: true, title: true },
  });
  await writeAudit({ actorUserId: g.userId, action: `Course.${status}`, entityType: "Course", entityId: id });
  if (status === "published") {
    await notifySafely(async () => notifyDealers(await courseDealerIds(id), coursePayload(course)));
  }
  revalidateCourse(id);
  return { success: true, message: { draft: "Đã chuyển về bản nháp", published: "Đã xuất bản", archived: "Đã lưu trữ" }[status] };
}

const linkSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề là bắt buộc").max(250),
  url: z.string().trim().url("Đường dẫn không hợp lệ").max(1000).refine((u) => /^https?:\/\//i.test(u), "Chỉ nhận http/https"),
  isRequired: z.boolean(),
});

export async function addLinkMaterialAction(courseId: string, input: z.input<typeof linkSchema>) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(courseId)) return { error: "Không tìm thấy khóa học" };
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const last = await prisma.courseMaterial.findFirst({ where: { courseId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await prisma.courseMaterial.create({
    data: { courseId, kind: "link", ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 1 },
  });
  await writeAudit({ actorUserId: g.userId, action: "Course.AddMaterial", entityType: "Course", entityId: courseId, details: parsed.data });
  revalidateCourse(courseId);
  return { success: true, message: "Đã thêm tài liệu" };
}

export async function updateMaterialAction(materialId: string, input: { isRequired?: boolean; move?: "up" | "down" }) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(materialId)) return { error: "Không tìm thấy tài liệu" };
  const material = await prisma.courseMaterial.findUnique({ where: { id: materialId }, select: { id: true, courseId: true } });
  if (!material) return { error: "Không tìm thấy tài liệu" };

  if (typeof input.isRequired === "boolean") {
    await prisma.courseMaterial.update({ where: { id: materialId }, data: { isRequired: input.isRequired } });
  }
  if (input.move) {
    const list = await prisma.courseMaterial.findMany({
      where: { courseId: material.courseId },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    const i = list.findIndex((m) => sameId(m.id, materialId));
    const j = input.move === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      await prisma.$transaction(list.map((m, idx) => prisma.courseMaterial.update({ where: { id: m.id }, data: { sortOrder: idx + 1 } })));
    }
  }
  revalidateCourse(material.courseId);
  return { success: true, message: "Đã cập nhật" };
}

export async function deleteMaterialAction(materialId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(materialId)) return { error: "Không tìm thấy tài liệu" };
  const material = await prisma.courseMaterial.findUnique({ where: { id: materialId }, select: { courseId: true, storageKey: true, title: true } });
  if (!material) return { error: "Không tìm thấy tài liệu" };
  await prisma.courseMaterial.delete({ where: { id: materialId } });
  if (material.storageKey) await deleteFile(material.storageKey);
  await writeAudit({ actorUserId: g.userId, action: "Course.DeleteMaterial", entityType: "Course", entityId: material.courseId, details: { title: material.title } });
  revalidateCourse(material.courseId);
  return { success: true, message: "Đã xóa tài liệu" };
}

const sessionSchema = z
  .object({
    title: z.string().trim().min(3, "Tiêu đề tối thiểu 3 ký tự").max(250),
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

export async function saveSessionAction(courseId: string, sessionId: string | null, input: SessionInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(courseId)) return { error: "Không tìm thấy khóa học" };
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const s = parsed.data;
  const data = { title: s.title, presenterName: s.presenterName || null, startsAt: s.start!, endsAt: s.end!, meetUrl: s.meetUrl };
  let savedId: string;
  if (sessionId) {
    if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
    savedId = (await prisma.trainingSession.update({ where: { id: sessionId }, data, select: { id: true } })).id;
  } else {
    savedId = (await prisma.trainingSession.create({ data: { ...data, courseId }, select: { id: true } })).id;
  }
  await writeAudit({ actorUserId: g.userId, action: sessionId ? "Session.Update" : "Session.Create", entityType: "Course", entityId: courseId, details: data });
  revalidateCourse(courseId);
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { status: true, title: true } });
  if (course?.status === "published") {
    await notifySafely(async () =>
      notifyDealers(await courseDealerIds(courseId), {
        type: "session",
        title: sessionId ? `Lịch training thay đổi: ${data.title}` : `Lịch training mới: ${data.title}`,
        body: `${formatDateTime(data.startsAt)} – ${formatTime(data.endsAt)} · ${course.title}`,
        link: "/training-sessions",
        dedupeKey: sessionId ? `session-update:${savedId.toLowerCase()}:${Date.now()}` : `session-new:${savedId.toLowerCase()}`,
      })
    );
  }
  return {
    success: true,
    message:
      course?.status === "published"
        ? "Đã lưu lịch training"
        : "Đã lưu lịch training. Khóa học đang là bản nháp — đại lý chỉ thấy lịch sau khi bạn bấm Xuất bản",
  };
}

export async function setSessionStatusAction(sessionId: string, status: "scheduled" | "cancelled" | "completed") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const s = await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { status },
    select: { courseId: true, title: true, startsAt: true, endsAt: true, course: { select: { status: true, title: true } } },
  });
  await writeAudit({ actorUserId: g.userId, action: `Session.${status}`, entityType: "TrainingSession", entityId: sessionId });
  if (s.course.status === "published" && status !== "completed") {
    const cancelled = status === "cancelled";
    await notifySafely(async () =>
      notifyDealers(await courseDealerIds(s.courseId), {
        type: cancelled ? "session_cancel" : "session",
        title: cancelled ? `Buổi training bị hủy: ${s.title}` : `Buổi training được khôi phục: ${s.title}`,
        body: `${formatDateTime(s.startsAt)} – ${formatTime(s.endsAt)} · ${s.course.title}`,
        link: "/training-sessions",
        dedupeKey: `session-${status}:${sessionId.toLowerCase()}:${Date.now()}`,
      })
    );
  }
  revalidateCourse(s.courseId);
  return { success: true, message: "Đã cập nhật" };
}

export async function enrollCourseAction(courseId: string, input: AssignInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(courseId)) return { error: "Không tìm thấy khóa học" };
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { ids, missing } = await resolveDealers(parsed.data);
  const existing = await prisma.courseEnrollment.findMany({ where: { courseId }, select: { dealerId: true } });
  const toAdd = ids.filter((id) => !existing.some((e) => sameId(e.dealerId, id)));
  if (toAdd.length) await prisma.courseEnrollment.createMany({ data: toAdd.map((dealerId) => ({ courseId, dealerId })) });
  await writeAudit({ actorUserId: g.userId, action: "Course.Enroll", entityType: "Course", entityId: courseId, details: { added: toAdd.length, missing } });
  revalidateCourse(courseId);
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, status: true, title: true } });
  if (course?.status === "published" && toAdd.length) {
    await notifySafely(() => notifyDealers(toAdd, coursePayload(course)));
  }
  return {
    success: true,
    message:
      `Đã giao thêm ${toAdd.length} đại lý` +
      (missing.length ? `. Không tìm thấy: ${missing.slice(0, 10).join(", ")}` : "") +
      (course?.status !== "published" ? ". Khóa học đang là bản nháp — đại lý chỉ thấy sau khi bạn bấm Xuất bản" : ""),
  };
}

export async function unenrollCourseAction(courseId: string, dealerId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(courseId) || !isGuid(dealerId)) return { error: "Không tìm thấy" };
  await prisma.courseEnrollment.deleteMany({ where: { courseId, dealerId } });
  await writeAudit({ actorUserId: g.userId, action: "Course.Unenroll", entityType: "Course", entityId: courseId, details: { dealerId } });
  revalidateCourse(courseId);
  return { success: true, message: "Đã bỏ giao" };
}
