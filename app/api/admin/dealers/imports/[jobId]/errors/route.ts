import { requireAdmin } from "@/lib/auth-guard";
import { apiError, guardResponse } from "@/lib/http";
import { isGuid } from "@/lib/ids";
import type { RowError } from "@/lib/import/dealer-import";
import { XLSX_TYPE, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const { jobId } = await params;
  if (!isGuid(jobId)) return apiError(404, "NOT_FOUND", "Không tìm thấy phiên import");

  const rows = await prisma.importRow.findMany({
    where: { jobId, isValid: false },
    orderBy: { rowNumber: "asc" },
    select: { rowNumber: true, payload: true, errors: true },
  });

  const out = rows.map((r) => {
    const p = JSON.parse(r.payload) as Record<string, string>;
    const errors = r.errors ? (JSON.parse(r.errors) as RowError[]) : [];
    return {
      row: r.rowNumber,
      code: p.code ?? "",
      dealerName: p.dealerName ?? "",
      userName: p.userName ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      region: p.region ?? "",
      errors: errors.map((e) => `${e.column}: ${e.message}`).join("; "),
    };
  });

  const buffer = await buildWorkbook([
    {
      name: "Dong loi",
      columns: [
        { header: "Dòng", key: "row", width: 8 },
        { header: "Mã đại lý", key: "code" },
        { header: "Tên đại lý", key: "dealerName", width: 30 },
        { header: "Họ tên người dùng", key: "userName", width: 24 },
        { header: "Email đăng nhập", key: "email", width: 28 },
        { header: "Số điện thoại", key: "phone" },
        { header: "Khu vực", key: "region" },
        { header: "Lỗi", key: "errors", width: 70 },
      ],
      rows: out,
    },
  ]);
  return fileResponse(buffer, "dong-loi-import.xlsx", XLSX_TYPE);
}
