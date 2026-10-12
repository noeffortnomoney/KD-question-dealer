import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-guard";
import { apiError, guardResponse, readJson } from "@/lib/http";
import { guidSchema } from "@/lib/ids";
import { markRead } from "@/lib/notifications";

const bodySchema = z.union([z.object({ all: z.literal(true) }), z.object({ ids: z.array(guidSchema).min(1).max(500) })]);

export async function POST(request: Request) {
  const guard = await requireUser();
  if ("error" in guard) return guardResponse(guard);
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Dữ liệu không hợp lệ");
  const updated = await markRead(guard.userId, "all" in parsed.data ? "all" : parsed.data.ids);
  return NextResponse.json({ updated });
}
