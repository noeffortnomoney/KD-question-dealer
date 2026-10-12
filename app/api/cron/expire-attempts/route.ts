import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { expireOverdueAttempts } from "@/lib/exam/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return apiError(401, "UNAUTHORIZED", "Sai cron secret");
  }
  const result = await expireOverdueAttempts(200);
  const purged = await prisma.importJob.deleteMany({ where: { expiresAt: { lt: new Date() }, status: "previewed" } });
  return NextResponse.json({ ...result, purgedImportJobs: purged.count });
}
