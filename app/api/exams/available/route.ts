import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth-guard";
import { guardResponse } from "@/lib/http";
import { listDealerExams } from "@/lib/exam/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);
  const exams = await listDealerExams(guard.dealerId);
  return NextResponse.json({ exams, serverNowUtc: new Date().toISOString() });
}
