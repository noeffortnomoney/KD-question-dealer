import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isGuid } from "@/lib/ids";
import { markRead } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const base = new URL(request.url);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", base));
  const { id } = await params;
  if (!isGuid(id)) return NextResponse.redirect(new URL("/notifications", base));
  const n = await prisma.notification.findFirst({ where: { id, userId: session.user.id }, select: { link: true } });
  if (!n) return NextResponse.redirect(new URL("/notifications", base));
  await markRead(session.user.id, [id]);
  const target = n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/notifications";
  return NextResponse.redirect(new URL(target, base));
}
