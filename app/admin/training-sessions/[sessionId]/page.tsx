import { Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatTime } from "@/lib/date-utils";
import { getSessionAttendance, type AttendanceFilter } from "@/lib/queries/attendance";
import { SESSION_PHASE_LABEL } from "@/lib/session-status";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Điểm danh buổi training — Kymdan" };

const TABS: { key: AttendanceFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "joined", label: "Đã tham gia" },
  { key: "missing", label: "Chưa tham gia" },
];

export default async function SessionAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ filter?: string; q?: string; page?: string; size?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const filter: AttendanceFilter = sp.filter === "joined" || sp.filter === "missing" ? sp.filter : "all";
  const data = await getSessionAttendance(sessionId, filter, sp.q ?? "");
  if (!data) notFound();
  const { session, summary } = data;
  const size = parsePageSize(sp.size);
  const { items: rows, page, total, offset } = paginate(data.rows, parsePage(sp.page), size);
  const base = `/admin/training-sessions/${session.id}`;
  const exportQs = new URLSearchParams({ filter, ...(sp.q ? { q: sp.q } : {}) }).toString();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href={`/admin/courses/${session.course.id}?tab=sessions`} className="text-sm text-muted-foreground hover:text-brand">
        ← {session.course.title}
      </Link>
      <PageHeader
        title={`Điểm danh: ${session.title}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge map={SESSION_PHASE_LABEL} value={session.phase} />
            <span>
              {formatDateTime(session.startsAt)} – {formatTime(session.endsAt)}
              {session.presenterName && ` · ${session.presenterName}`}
            </span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <a href={session.meetUrl} target="_blank" rel="noopener noreferrer">
                Mở Google Meet <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button asChild>
              <a href={`/api/admin/training-sessions/${session.id}/attendance/export?${exportQs}`}>
                <Download className="size-4" /> Xuất Excel
              </a>
            </Button>
          </>
        }
      />

      {session.phase === "live" && (
        <div className="mb-4">
          <AutoRefresh seconds={30} />
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Đại lý được giao" value={summary.assigned} tone="info" />
        <StatCard label="Đã bấm tham gia" value={summary.joined} hint={`${summary.rate.toLocaleString("vi-VN")}% đại lý được giao`} tone="success" />
        <StatCard label="Chưa tham gia" value={summary.missing} tone="warning" />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        &quot;Đã tham gia&quot; = đại lý đã bấm nút Tham gia trong app để mở Google Meet. Google Meet bản miễn phí không cung cấp dữ
        liệu ai ở lại trong phòng bao lâu.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`${base}?filter=${t.key}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${sp.size ? `&size=${sp.size}` : ""}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              filter === t.key ? "bg-brand text-white" : "bg-card hover:bg-brand-soft"
            )}
          >
            {t.label} ({t.key === "all" ? summary.assigned : t.key === "joined" ? summary.joined : summary.missing})
          </Link>
        ))}
        <form method="get" action={base} className="ml-auto">
          <input type="hidden" name="filter" value={filter} />
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Tìm mã, tên, email…"
            className="h-9 w-60 rounded-md border bg-card px-3 text-sm outline-none focus:border-brand"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={filter === "joined" ? "Chưa có đại lý nào bấm tham gia" : "Không có đại lý"} />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Mã</TableHead>
                <TableHead>Đại lý</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Khu vực</TableHead>
                <TableHead>Bấm tham gia lúc</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.dealerId} data-testid={`attendance-${r.code}`}>
                  <TableCell className="text-muted-foreground">{offset + i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <div>{r.userName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell>{r.region ?? "—"}</TableCell>
                  <TableCell>
                    {r.joinedAt ? (
                      <span className="font-medium text-success">{formatDateTime(r.joinedAt)}</span>
                    ) : (
                      <span className="text-muted-foreground">Chưa tham gia</span>
                    )}
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
