import { requireAdmin } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { apiError, guardResponse } from "@/lib/http";
import { CSV_TYPE, XLSX_TYPE, buildCsv, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { REPORT_STATUS_LABEL, getExamReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { header: "Mã đại lý", key: "code", width: 14 },
  { header: "Tên đại lý", key: "name", width: 32 },
  { header: "Khu vực", key: "region", width: 18 },
  { header: "Trạng thái", key: "status", width: 12 },
  { header: "Lượt", key: "attemptNo", width: 8 },
  { header: "Bắt đầu", key: "startedAt", width: 18 },
  { header: "Kết thúc", key: "finishedAt", width: 18 },
  { header: "Số câu đúng", key: "correct", width: 12 },
  { header: "Điểm (%)", key: "score", width: 10 },
  { header: "Kết quả", key: "result", width: 12 },
  { header: "Số lượt đã hủy", key: "voided", width: 14 },
];

export async function GET(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const { examId } = await params;
  const url = new URL(request.url);
  const report = await getExamReport(examId, {
    region: url.searchParams.get("region") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    result: url.searchParams.get("result") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!report) return apiError(404, "NOT_FOUND", "Không tìm thấy kỳ thi");

  const rows = report.rows.map((r) => ({
    code: r.dealerCode,
    name: r.dealerName,
    region: r.region ?? "",
    status: REPORT_STATUS_LABEL[r.status],
    attemptNo: r.attemptNo ?? "",
    startedAt: r.startedAt ? formatDateTime(r.startedAt) : "",
    finishedAt: r.finishedAt ? formatDateTime(r.finishedAt) : "",
    correct: r.correctCount === null ? "" : `${r.correctCount}/${r.totalQuestions}`,
    score: r.scorePercent ?? "",
    result: r.isPassed === null ? "" : r.isPassed ? "Đạt" : "Không đạt",
    voided: r.voidedCount,
  }));

  const base = `ket-qua-${report.exam.title}`.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 80);
  if (url.searchParams.get("format") === "csv") {
    return fileResponse(buildCsv(COLUMNS, rows), `${base}.csv`, CSV_TYPE);
  }
  const buffer = await buildWorkbook([{ name: "Ket qua", columns: COLUMNS, rows }]);
  return fileResponse(buffer, `${base}.xlsx`, XLSX_TYPE);
}
