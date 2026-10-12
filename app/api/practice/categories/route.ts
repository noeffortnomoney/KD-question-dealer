import { NextResponse } from "next/server";
import { requireDealer } from "@/lib/auth-guard";
import { guardResponse } from "@/lib/http";
import { listPracticeCategories } from "@/lib/practice";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);
  return NextResponse.json({ categories: await listPracticeCategories() });
}
