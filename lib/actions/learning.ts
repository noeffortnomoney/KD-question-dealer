"use server";

import { revalidatePath } from "next/cache";
import { requireDealer } from "@/lib/auth-guard";
import { isGuid } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { canJoinSession } from "@/lib/session-status";

export async function joinSessionAction(sessionId: string) {
  const g = await requireDealer();
  if ("error" in g) return { error: g.error };
  if (!isGuid(sessionId)) return { error: "Không tìm thấy buổi training" };
  const session = await prisma.trainingSession.findFirst({
    where: { id: sessionId, assignments: { some: { dealerId: g.dealerId } } },
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
