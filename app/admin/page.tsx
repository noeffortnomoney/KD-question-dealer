import { AlertTriangle, CalendarDays, ChevronRight, ClipboardList, Info, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { AvgScoreBars } from "@/components/admin/charts/AvgScoreBars";
import { ParticipationBar } from "@/components/admin/charts/ParticipationBar";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { getAdminDashboard } from "@/lib/admin-stats";
import { formatDate } from "@/lib/date-utils";
import { formatPercent } from "@/lib/format";
import { EXAM_PHASE_LABEL, examPhase } from "@/lib/exam-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tổng quan — Kymdan" };

export default async function AdminDashboard() {
  const d = await getAdminDashboard();
  const chartData = d.examStats
    .filter((e) => e.avgScore !== null)
    .map((e) => ({ title: e.title, avgScore: e.avgScore!, passRate: e.passRate, finished: e.finished }));

  const alerts: { tone: "warn" | "info"; text: React.ReactNode }[] = [];
  if (d.alerts.stuck > 0) {
    alerts.push({ tone: "warn", text: <>{d.alerts.stuck} lượt thi đã quá hạn nhưng chưa được đóng — kiểm tra cron <code>/api/cron/expire-attempts</code>.</> });
  }
  for (const title of d.alerts.insufficient) {
    alerts.push({ tone: "warn", text: <>Kỳ thi đang mở &quot;{title}&quot; không còn đủ câu hỏi đã xuất bản.</> });
  }
  if (d.alerts.sessionsSoon > 0) alerts.push({ tone: "info", text: <>{d.alerts.sessionsSoon} buổi training diễn ra trong 24 giờ tới.</> });
  if (d.alerts.neverLoggedIn > 0) alerts.push({ tone: "info", text: <>{d.alerts.neverLoggedIn} tài khoản đại lý chưa đăng nhập lần nào.</> });

  return (
    <div className="space-y-6">
      <PageHeader title="Tổng quan hệ thống" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Đại lý hoạt động" value={d.kpi.activeDealers} hint={d.kpi.lockedDealers ? `${d.kpi.lockedDealers} đang khóa` : undefined} icon={Users} tone="info" />
        <StatCard label="Lịch training sắp tới" value={d.kpi.upcomingSessions} icon={CalendarDays} tone="success" />
        <StatCard label="Kỳ thi đang mở" value={d.kpi.openExams} icon={ClipboardList} tone="brand" />
        <StatCard label="Tỷ lệ đạt trung bình" value={formatPercent(d.kpi.passRate)} hint={`${d.kpi.finishedAttempts} bài đã chấm`} icon={Trophy} tone="warning" />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={a.tone === "warn" ? "flex items-center gap-2 rounded-lg border border-amber-200 bg-warning-soft px-4 py-2.5 text-sm text-amber-900" : "flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm"}
            >
              {a.tone === "warn" ? <AlertTriangle className="size-4 shrink-0" /> : <Info className="size-4 shrink-0 text-sky-600" />}
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Tình trạng tham gia kỳ thi</h2>
          {d.participation ? (
            <>
              <p className="mb-4 text-xs text-muted-foreground">
                <Link href={`/admin/reports?exam=${d.participation.examId}`} className="hover:text-brand">
                  {d.participation.title}
                </Link>{" "}
                · {d.participation.assigned} đại lý được giao
              </p>
              <ParticipationBar data={d.participation} />
            </>
          ) : (
            <EmptyState title="Chưa có kỳ thi" className="mt-4 py-8" />
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Điểm trung bình theo kỳ thi</h2>
          <p className="mb-2 text-xs text-muted-foreground">Thang 100, các kỳ thi gần nhất có bài đã chấm</p>
          {chartData.length ? <AvgScoreBars data={chartData} /> : <EmptyState title="Chưa có bài thi được chấm" className="py-8" />}
        </section>
      </div>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Kỳ thi gần đây</h2>
          <Link href="/admin/exams" className="flex items-center text-sm text-brand hover:underline">
            Xem tất cả <ChevronRight className="size-4" />
          </Link>
        </div>
        {d.examStats.length === 0 ? (
          <EmptyState title="Chưa có kỳ thi" className="m-4" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SttHead />
                <TableHead>Tên kỳ thi</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Đã thi / Được giao</TableHead>
                <TableHead className="text-right">Điểm TB</TableHead>
                <TableHead className="text-right">Tỷ lệ đạt</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...d.examStats].reverse().map((e, i) => (
                <TableRow key={e.id}>
                  <SttCell n={i + 1} />
                  <TableCell>
                    <Link href={`/admin/reports?exam=${e.id}`} className="font-medium hover:text-brand">
                      {e.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(e.startsAt)} → {formatDate(e.endsAt)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.finished}/{e.assigned}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e.avgScore?.toLocaleString("vi-VN") ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(e.passRate)}</TableCell>
                  <TableCell>
                    <StatusBadge map={EXAM_PHASE_LABEL} value={examPhase(e)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
