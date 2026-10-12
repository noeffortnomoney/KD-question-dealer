import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { apiError, guardResponse, readJson } from "@/lib/http";
import { guidSchema } from "@/lib/ids";
import { findExisting } from "@/lib/import/existing";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

const bodySchema = z.object({ jobId: guidSchema });

interface StoredRow {
  code: string;
  dealerName: string;
  userName: string;
  email: string;
  phone: string;
  region: string;
  passwordHash: string | null;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Thiếu jobId");

  const job = await prisma.importJob.findUnique({
    where: { id: parsed.data.jobId },
    select: { id: true, status: true, expiresAt: true, fileName: true },
  });
  if (!job) return apiError(404, "NOT_FOUND", "Không tìm thấy phiên import");
  if (job.status !== "previewed") return apiError(409, "CONFLICT", "Phiên import này đã được xác nhận");
  if (job.expiresAt < new Date()) return apiError(409, "CONFLICT", "Phiên import đã hết hạn, vui lòng tải file lại");

  const rows = await prisma.importRow.findMany({
    where: { jobId: job.id, isValid: true },
    orderBy: { rowNumber: "asc" },
    select: { rowNumber: true, payload: true },
  });
  const data = rows.map((r) => ({ rowNumber: r.rowNumber, ...(JSON.parse(r.payload) as StoredRow) }));

  const existing = await findExisting(
    data.map((d) => d.code),
    data.map((d) => d.email)
  );
  const skipped = data
    .filter((d) => existing.codes.has(d.code) || existing.emails.has(d.email))
    .map((d) => ({ row: d.rowNumber, code: d.code, reason: "Mã đại lý hoặc email vừa được tạo bởi thao tác khác" }));
  const toCreate = data.filter((d) => !existing.codes.has(d.code) && !existing.emails.has(d.email));

  const credentials: { code: string; email: string; tempPassword: string }[] = [];
  const prepared: (StoredRow & { rowNumber: number; passwordHash: string })[] = [];
  for (const d of toCreate) {
    let hash = d.passwordHash;
    if (!hash) {
      const temp = generateTempPassword();
      hash = await hashPassword(temp);
      credentials.push({ code: d.code, email: d.email, tempPassword: temp });
    }
    prepared.push({ ...d, passwordHash: hash });
  }

  const created = await prisma.$transaction(
    async (tx) => {
      const flipped = await tx.importJob.updateMany({
        where: { id: job.id, status: "previewed" },
        data: { status: "committed", committedAt: new Date() },
      });
      if (flipped.count === 0) return null;
      for (const d of prepared) {
        await tx.dealer.create({
          data: {
            code: d.code,
            name: d.dealerName,
            phone: d.phone || null,
            region: d.region || null,
            users: {
              create: {
                email: d.email,
                name: d.userName,
                passwordHash: d.passwordHash,
                role: "dealer",
                mustChangePassword: true,
              },
            },
          },
        });
      }
      await writeAudit(
        {
          actorUserId: guard.userId,
          action: "Dealer.Import",
          entityType: "ImportJob",
          entityId: job.id,
          details: { fileName: job.fileName, created: prepared.length, skipped: skipped.length },
        },
        tx
      );
      return prepared.length;
    },
    { timeout: 120_000, maxWait: 10_000 }
  );

  if (created === null) return apiError(409, "CONFLICT", "Phiên import này đã được xác nhận");
  await prisma.importRow.updateMany({ where: { jobId: job.id, isValid: true }, data: { payload: "{}" } });

  return NextResponse.json({ created, skipped, credentials });
}
