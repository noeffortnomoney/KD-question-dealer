import { Download, Medal } from "lucide-react";
import Link from "next/link";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";
import { ReportTable } from "@/components/admin/ReportTable";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date-utils";
import { formatPercent } from "@/lib/format";
import { isGuid } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { REPORT_DEFAULT_SORT, REPORT_SORT_KEYS, REPORT_STATUS_LABEL, getExamReport, sortReportRows } from "@/lib/reports";
import { parseSort } from "@/lib/sort";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kết quả & báo cáo — Kymdan" };

type SP = { exam?: string; region?: string; status?: string; result?: string; q?: string; page?: string; size?: string; sort?: string; dir?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const exams = await prisma.exam.findMany({
    where: { status: { not: "draft" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true },
  });
  const examId = sp.exam && isGuid(sp.exam) ? sp.exam : exams[0]?.id;
  const report = examId ? await getExamReport(examId, sp) : null;

  if (!report) {
    return (
      <div>
        <PageHeader title="Kết quả & báo cáo" />
        <EmptyState title="Chưa có kỳ thi nào được xuất bản" />
      </div>
    );
  }

  const size = parsePageSize(sp.size);
  const sort = parseSort(sp, REPORT_SORT_KEYS, REPORT_DEFAULT_SORT);
  const pageRows = paginate(sortReportRows(report.rows, sort), parsePage(sp.page), size);

  const exportParams = new URLSearchParams(
    Object.entries({ region: sp.region, status: sp.status, result: sp.result, q: sp.q, sort: sp.sort, dir: sp.dir }).filter(([, v]) => v) as [
      string,
      string,
    ][]
  );
  const exportUrl = (format: string) => {
    const p = new URLSearchParams(exportParams);
    p.set("format", format);
    return `/api/admin/reports/exams/${report.exam.id}/export?${p}`;
  };

  return (
    <div>
      <PageHeader
        title="Kết quả & báo cáo"
        description={`${report.exam.title} · ${report.exam.questionCount} câu · ${report.exam.durationMinutes} phút · điểm đạt ${report.exam.passMarkPercent}% · ${formatDateTime(report.exam.startsAt, "…")} → ${formatDateTime(report.exam.endsAt, "…")}`}
        actions={
          <>
            <Button asChild>
              <Link href={`/admin/exams/${report.exam.id}?tab=ranking`}>
                <Medal className="size-4" /> Bảng xếp hạng
              </Link>
            </Button>
            <Button asChild variant="outline">
              <a href={exportUrl("xlsx")}>
                <Download className="size-4" /> Excel
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={exportUrl("csv")}>
                <Download className="size-4" /> CSV
              </a>
            </Button>
          </>
        }
      />

      <form method="get" className="mb-4">
        <select
          name="exam"
          defaultValue={report.exam.id}
          className="h-10 min-w-80 rounded-lg border bg-card px-3 text-sm font-medium"
          aria-label="Chọn kỳ thi"
        >
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} {e.status === "closed" ? "(đã đóng)" : e.status === "archived" ? "(lưu trữ)" : ""}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" className="ml-2 h-10">
          Xem
        </Button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Được giao" value={report.summary.assigned} hint={`${report.summary.notStarted} chưa thi`} />
        <StatCard label="Đã thi" value={report.summary.finished} hint={`${report.summary.inProgress} đang làm`} tone="info" />
        <StatCard label="Tỷ lệ đạt" value={formatPercent(report.summary.passRate)} hint={`${report.summary.passed} đạt · ${report.summary.failed} không đạt`} tone="success" />
        <StatCard label="Điểm trung bình" value={report.summary.avgScore.toLocaleString("vi-VN")} hint="Thang 100" tone="warning" />
      </div>

      <FilterBar
        basePath="/admin/reports"
        q={sp.q}
        placeholder="Tìm mã hoặc tên đại lý…"
        hidden={{ exam: report.exam.id, sort: sp.sort, dir: sp.dir }}
        selects={[
          { name: "region", label: "Tất cả khu vực", value: sp.region, options: report.regions.map((r) => ({ value: r, label: r })) },
          {
            name: "status",
            label: "Mọi trạng thái",
            value: sp.status,
            options: Object.entries(REPORT_STATUS_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            name: "result",
            label: "Mọi kết quả",
            value: sp.result,
            options: [
              { value: "passed", label: "Đạt" },
              { value: "failed", label: "Không đạt" },
            ],
          },
        ]}
      />

      {report.rows.length === 0 ? (
        <EmptyState title="Không có dữ liệu phù hợp bộ lọc" />
      ) : (
        <div className="rounded-xl border bg-card">
          <p className="border-b px-4 py-2 text-xs text-muted-foreground">
            {report.rows.length} dòng · Bấm tiêu đề cột để sắp xếp · Bấm vào dòng đã thi (hoặc biểu tượng con mắt) để xem bài làm hoặc cấp lại lượt
          </p>
          <ReportTable
            sort={sort}
            offset={pageRows.offset}
            rows={pageRows.items.map((r) => ({
              ...r,
              startedAt: r.startedAt?.toISOString() ?? null,
            }))}
          />
          <Pagination page={pageRows.page} pageSize={size} total={pageRows.total} className="border-t" />
        </div>
      )}
    </div>
  );
}
