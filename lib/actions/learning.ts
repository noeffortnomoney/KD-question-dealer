"use server";

import { revalidatePath } from "next/cache";
import { requireDealer } from "@/lib/auth-guard";
import { isGuid, sameId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { canJoinSession } from "@/lib/session-status";

async function enrolledMaterial(materialId: string, dealerId: string) {
  if (!isGuid(materialId)) return null;
  const material = await prisma.courseMaterial.findUnique({
    where: { id: materialId },
    select: { id: true, kind: true, url: true, courseId: true, course: { select: { status: true } } },
  });
  if (!material || material.course.status !== "published") return null;
  const enrolled = await prisma.courseEnrollment.findUnique({
    where: { courseId_dealerId: { courseId: material.courseId, dealerId } },
    select: { id: true },
  });
  return enrolled ? material : null;
}

async function refreshCompletion(courseId: string, dealerId: string) {
  const materials = await prisma.courseMaterial.findMany({ where: { courseId }, select: { id: true, isRequired: true } });
  const done = await prisma.materialProgress.findMany({
    where: { dealerId, materialId: { in: materials.map((m) => m.id) }, completedAt: { not: null } },
    select: { materialId: true },
  });
  const isDone = (id: string) => done.some((d) => sameId(d.materialId, id));
  const required = materials.filter((m) => m.isRequired);
  const completed =
    materials.length > 0 && (required.length ? required.every((m) => isDone(m.id)) : materials.every((m) => isDone(m.id)));
  await prisma.courseEnrollment.updateMany({
    where: { courseId, dealerId },
    data: completed ? { status: "completed", completedAt: new Date() } : { status: "enrolled", completedAt: null },
  });
}

export async function openMaterialAction(materialId: string) {
  const g = await requireDealer();
  if ("error" in g) return { error: g.error };
  const material = await enrolledMaterial(materialId, g.dealerId);
  if (!material) return { error: "Không tìm thấy tài liệu" };
  await prisma.materialProgress.upsert({
    where: { materialId_dealerId: { materialId: material.id, dealerId: g.dealerId } },
    create: { materialId: material.id, dealerId: g.dealerId },
    update: {},
  });
  revalidatePath(`/courses/${material.courseId}`);
  return {
    success: true,
    url: material.kind === "file" ? `/api/materials/${material.id}/download` : material.url ?? "",
  };
}

export async function completeMaterialAction(materialId: string) {
  const g = await requireDealer();
  if ("error" in g) return { error: g.error };
  const material = await enrolledMaterial(materialId, g.dealerId);
  if (!material) return { error: "Không tìm thấy tài liệu" };
  await prisma.materialProgress.upsert({
    where: { materialId_dealerId: { materialId: material.id, dealerId: g.dealerId } },
    create: { materialId: material.id, dealerId: g.dealerId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });
  await refreshCompletion(material.courseId, g.dealerId);
  revalidatePath(`/courses/${material.courseId}`);
  revalidatePath("/courses");
  return { success: true };
}

export async function joinSessionAction(sessionId: string) {
  const g = await requireDealer();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const session = await prisma.trainingSession.findFirst({
    where: {
      id: sessionId,
      course: { status: "published", enrollments: { some: { dealerId: g.dealerId } } },
    },
    select: { id: true, meetUrl: true, startsAt: true, endsAt: true, status: true },
  });
  if (!session) return { error: "Không tìm thấy buổi training" };
  if (!canJoinSession(session)) return { error: "Chưa đến giờ tham gia hoặc buổi training đã kết thúc" };
  await prisma.attendance.upsert({
    where: { sessionId_dealerId: { sessionId: session.id, dealerId: g.dealerId } },
    create: { sessionId: session.id, dealerId: g.dealerId, joinedAt: new Date(), source: "click" },
    update: {},
  });
  revalidatePath("/training-sessions");
  revalidatePath("/dashboard");
  return { success: true, url: session.meetUrl };
}
