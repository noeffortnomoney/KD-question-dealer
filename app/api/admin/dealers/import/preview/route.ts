import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { apiError, guardResponse } from "@/lib/http";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  mapRows,
  validateRows,
  type DealerImportRow,
} from "@/lib/import/dealer-import";
import { readTable } from "@/lib/import/excel";
import { findExisting } from "@/lib/import/existing";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

const PREVIEW_LIMIT = 200;
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

function looksLikeXlsx(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function rowFields(data: DealerImportRow) {
  return {
    code: data.code,
    dealerName: data.dealerName,
    userName: data.userName,
    email: data.email,
    phone: data.phone,
    region: data.region,
  };
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(422, "VALIDATION_FAILED", "Không đọc được file tải lên");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(422, "VALIDATION_FAILED", "Chưa chọn file");
  if (file.size > IMPORT_MAX_BYTES) return apiError(413, "PAYLOAD_TOO_LARGE", "File vượt quá 5 MB");

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  const isCsv = name.endsWith(".csv");
  if (!isCsv && !(name.endsWith(".xlsx") && looksLikeXlsx(buffer))) {
    return apiError(415, "UNSUPPORTED_FILE", "Chỉ nhận file .xlsx hoặc .csv");
  }

  let table: string[][];
  try {
    table = await readTable(buffer, name);
  } catch {
    return apiError(422, "VALIDATION_FAILED", "File không đúng định dạng");
  }

  const { rows, missing } = mapRows(table);
  if (missing.length > 0) {
    return apiError(422, "VALIDATION_FAILED", `Thiếu cột bắt buộc: ${missing.join(", ")}`);
  }
  if (rows.length === 0) return apiError(422, "VALIDATION_FAILED", "File không có dòng dữ liệu");
  if (rows.length > IMPORT_MAX_ROWS) {
    return apiError(422, "VALIDATION_FAILED", `Tối đa ${IMPORT_MAX_ROWS} dòng mỗi lần import`);
  }

  const existing = await findExisting(
    rows.map((r) => r.data.code),
    rows.map((r) => r.data.email)
  );
  const validated = validateRows(rows, existing);

  const stored = validated.map((r) => ({
    rowNumber: r.rowNumber,
    isValid: r.errors.length === 0,
    payload: JSON.stringify(rowFields(r.data)),
    errors: r.errors.length ? JSON.stringify(r.errors) : null,
  }));

  const validRows = validated.filter((r) => r.errors.length === 0).length;
  const job = await prisma.importJob.create({
    data: {
      uploadedById: guard.userId,
      fileName: file.name.slice(0, 260),
      totalRows: validated.length,
      validRows,
      errorRows: validated.length - validRows,
      expiresAt: new Date(Date.now() + JOB_TTL_MS),
      rows: { createMany: { data: stored } },
    },
    select: { id: true, expiresAt: true },
  });

  return NextResponse.json({
    jobId: job.id,
    totalRows: validated.length,
    validRows,
    errorRows: validated.length - validRows,
    expiresAtUtc: job.expiresAt.toISOString(),
    preview: validated.slice(0, PREVIEW_LIMIT).map((r) => ({
      row: r.rowNumber,
      ...rowFields(r.data),
      status: r.errors.length ? "error" : "valid",
      errors: r.errors,
    })),
  });
}
