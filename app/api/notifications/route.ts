import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { ensureReminders, listNotifications } from "@/lib/notifications";
import { toRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError(401, "UNAUTHORIZED", "Bạn cần đăng nhập");
  const url = new URL(request.url);
  const take = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 15) || 15));

  await ensureReminders({
    userId: session.user.id,
    role: toRole(session.user.role),
    dealerId: session.user.dealerId ?? null,
  }).catch((error) => console.error("reminders failed", error));

  return NextResponse.json(await listNotifications(session.user.id, take));
}
