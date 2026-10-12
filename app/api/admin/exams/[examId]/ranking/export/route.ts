import { requireAdmin } from "@/lib/auth-guard";
import { formatDateTime, formatDuration } from "@/lib/date-utils";
import { apiError, guardResponse } from "@/lib/http";
import { XLSX_TYPE, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { getExamRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const { examId } = await params;
  const url = new URL(request.url);
  const data = await getExamRanking(examId, {
    region: url.searchParams.get("region") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!data) return apiError(404, "NOT_FOUND", "Không tìm thấy kỳ thi");

  const buffer = await buildWorkbook([
    {
      name: "Xep hang",
      columns: [
        { header: "Hạng", key: "rank", width: 8 },
        { header: "Mã đại lý", key: "code", width: 14 },
        { header: "Tên đại lý", key: "name", width: 32 },
        { header: "Khu vực", key: "region", width: 18 },
        { header: "Điểm (%)", key: "score", width: 10 },
        { header: "Số câu đúng", key: "correct", width: 12 },
        { header: "Thời gian làm", key: "duration", width: 18 },
        { header: "Nộp lúc", key: "finishedAt", width: 18 },
        { header: "Kết quả", key: "result", width: 12 },
      ],
      rows: data.rows.map((r) => ({
        rank: r.rank,
        code: r.code,
        name: r.name,
        region: r.region ?? "",
        score: r.scorePercent,
        correct: `${r.correctCount}/${r.totalQuestions}`,
        duration: formatDuration(r.durationSeconds),
        finishedAt: formatDateTime(r.finishedAt),
        result: r.isPassed ? "Đạt" : "Không đạt",
      })),
    },
  ]);
  const name = `xep-hang-${data.exam.title}`.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 80);
  return fileResponse(buffer, `${name}.xlsx`, XLSX_TYPE);
}
