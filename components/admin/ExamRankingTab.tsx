import { Download, Medal } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { StatCard } from "@/components/common/StatCard";
import { ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { formatDateTime, formatDuration } from "@/lib/date-utils";
import { formatPercent, formatScore } from "@/lib/format";
import { getExamRanking } from "@/lib/ranking";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

const MEDAL = ["text-amber-500", "text-slate-400", "text-orange-700"];

export async function ExamRankingTab({
  examId,
  region,
  q,
  page: pageParam,
  size: sizeParam,
}: {
  examId: string;
  region?: string;
  q?: string;
  page?: string;
  size?: string;
}) {
  const data = await getExamRanking(examId, { region, q });
  if (!data) return null;
  const { stats, regions, ended, exam } = data;
  const size = parsePageSize(sizeParam);
  const { items: rows, page, total, offset } = paginate(data.rows, parsePage(pageParam), size);
  const exportQs = new URLSearchParams(Object.entries({ region, q }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {ended ? (
          <ToneBadge tone="success">Kết quả chính thức — kỳ thi đã kết thúc</ToneBadge>
        ) : (
          <ToneBadge tone="warning">Xếp hạng tạm thời — kỳ thi chưa kết thúc</ToneBadge>
        )}
        <ToneBadge tone={exam.showLeaderboard ? "info" : "muted"}>
          {exam.showLeaderboard ? "Đại lý xem được top 10" : "Đại lý chỉ xem hạng của mình"}
        </ToneBadge>
        <span className="text-xs text-muted-foreground">
          Xếp theo điểm cao → thời gian làm bài ngắn. Bằng cả hai thì đồng hạng. Không tính lượt đã hủy.
        </span>
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <a href={`/api/admin/exams/${examId}/ranking/export${exportQs ? `?${exportQs}` : ""}`}>
            <Download className="size-4" /> Xuất Excel
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Đã có điểm" value={stats.participants} hint={`${stats.assigned} đại lý được giao`} tone="info" />
        <StatCard label="Điểm cao nhất" value={formatScore(stats.topScore)} tone="success" />
        <StatCard label="Điểm trung bình" value={formatScore(stats.avgScore)} tone="warning" />
        <StatCard label="Tỷ lệ đạt" value={formatPercent(stats.passRate)} tone="brand" />
      </div>

      <FilterBar
        basePath={`/admin/exams/${examId}`}
        q={q}
        placeholder="Tìm mã hoặc tên đại lý…"
        hidden={{ tab: "ranking" }}
        selects={[{ name: "region", label: "Toàn quốc", value: region, options: regions.map((r) => ({ value: r, label: r })) }]}
      />
      {region && <p className="text-sm text-muted-foreground">Đang xếp hạng trong khu vực <b>{region}</b>.</p>}

      {rows.length === 0 ? (
        <EmptyState title="Chưa có bài thi nào được chấm" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <SttHead />
                <TableHead className="w-20">Hạng</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Đại lý</TableHead>
                <TableHead>Khu vực</TableHead>
                <TableHead className="text-right">Điểm</TableHead>
                <TableHead className="text-right">Số câu đúng</TableHead>
                <TableHead>Thời gian làm</TableHead>
                <TableHead>Nộp lúc</TableHead>
                <TableHead>Kết quả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.attemptId} data-testid={`rank-${r.code}`}>
                  <SttCell n={offset + i + 1} />
                  <TableCell>
                    <span className="flex items-center gap-1.5 font-bold tabular-nums">
                      {r.rank <= 3 && <Medal className={cn("size-4", MEDAL[r.rank - 1])} />}
                      {r.rank}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.region ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatScore(r.scorePercent)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.correctCount}/{r.totalQuestions}
                  </TableCell>
                  <TableCell className="text-xs">{formatDuration(r.durationSeconds)}</TableCell>
                  <TableCell className="text-xs">{formatDateTime(r.finishedAt)}</TableCell>
                  <TableCell>
                    <span className={r.isPassed ? "font-semibold text-success" : "font-semibold text-red-600"}>
                      {r.isPassed ? "Đạt" : "Không đạt"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={size} total={total} className="border-t" />
        </div>
      )}
    </div>
  );
}
