import { Download, ExternalLink, Pencil, UserMinus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignDealersDialog } from "@/components/admin/AssignDealersDialog";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { MaterialManager } from "@/components/admin/MaterialManager";
import { SessionDialog } from "@/components/admin/SessionDialog";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { ActionIcon, ActionsCell, ActionsHead, EmptyValue, SortableHead } from "@/components/common/TableParts";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { assignSessionAction, unassignSessionAction } from "@/lib/actions/admin/sessions";
import { formatDateTime, formatTime, toDateTimeLocalValue } from "@/lib/date-utils";
import {
  ATTENDANCE_DEFAULT_SORT,
  ATTENDANCE_SORT_KEYS,
  getSessionAttendance,
  sortAttendanceRows,
  type AttendanceFilter,
} from "@/lib/queries/attendance";
import { parseSort, type SortState } from "@/lib/sort";
import { listRegions } from "@/lib/queries/dealers";
import { SESSION_PHASE_LABEL } from "@/lib/session-status";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buổi training — Kymdan" };

const FILTERS: { key: AttendanceFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "joined", label: "Đã tham gia" },
  { key: "missing", label: "Chưa tham gia" },
];

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ tab?: string; filter?: string; q?: string; page?: string; size?: string; sort?: string; dir?: string }>;
}) {
  const { sessionId } = await params;
  const sp = await searchParams;
  const filter: AttendanceFilter = sp.filter === "joined" || sp.filter === "missing" ? sp.filter : "all";
  const raw = await getSessionAttendance(sessionId, filter, sp.q ?? "");
  if (!raw) notFound();
  const sort = parseSort(sp, ATTENDANCE_SORT_KEYS, ATTENDANCE_DEFAULT_SORT);
  const data = { ...raw, rows: sortAttendanceRows(raw.rows, sort) };
  const { session, summary } = data;
  const tab = sp.tab === "materials" ? "materials" : "attendance";
  const base = `/admin/training-sessions/${session.id}`;
  const exportQs = new URLSearchParams({
    filter,
    ...(sp.q ? { q: sp.q } : {}),
    ...(sp.sort ? { sort: sp.sort, dir: sp.dir ?? "asc" } : {}),
  }).toString();
  const [regions, materials] = await Promise.all([
    listRegions(),
    prisma.sessionMaterial.findMany({
      where: { sessionId: session.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, kind: true, url: true, fileName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/training-sessions" className="text-sm text-muted-foreground hover:text-brand">
        ← Lịch training
      </Link>
      <PageHeader
        title={session.title}
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
            <SessionDialog
              sessionId={session.id}
              initial={{
                title: session.title,
                description: session.description ?? "",
                presenterName: session.presenterName ?? "",
                startsAt: toDateTimeLocalValue(session.startsAt),
                endsAt: toDateTimeLocalValue(session.endsAt),
                meetUrl: session.meetUrl,
              }}
              trigger={
                <Button variant="outline">
                  <Pencil className="size-4" /> Sửa
                </Button>
              }
            />
            <Button asChild variant="outline">
              <a href={session.meetUrl} target="_blank" rel="noopener noreferrer">
                Mở Google Meet <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <AssignDealersDialog title="Giao buổi training cho đại lý" regions={regions} action={assignSessionAction.bind(null, session.id)} />
          </>
        }
      />
      {session.description && <p className="-mt-2 mb-4 whitespace-pre-line text-sm text-muted-foreground">{session.description}</p>}

      <nav className="mb-5 flex gap-1 border-b">
        {[
          { key: "attendance", label: `Đại lý & điểm danh (${summary.assigned})` },
          { key: "materials", label: `Tài liệu (${materials.length})` },
        ].map((t) => (
          <Link
            key={t.key}
            href={`${base}?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "materials" ? (
        <MaterialManager sessionId={session.id} materials={materials} />
      ) : (
        <AttendanceTab data={data} filter={filter} sp={sp} sort={sort} base={base} exportQs={exportQs} />
      )}
    </div>
  );
}

function AttendanceTab({
  data,
  filter,
  sp,
  sort,
  base,
  exportQs,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getSessionAttendance>>>;
  filter: AttendanceFilter;
  sp: { q?: string; page?: string; size?: string };
  sort: SortState;
  base: string;
  exportQs: string;
}) {
  const { session, summary } = data;
  const size = parsePageSize(sp.size);
  const { items: rows, page, total, offset } = paginate(data.rows, parsePage(sp.page), size);

  return (
    <>
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
        {FILTERS.map((t) => (
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
        <Button asChild variant="outline">
          <a href={`/api/admin/training-sessions/${session.id}/attendance/export?${exportQs}`}>
            <Download className="size-4" /> Xuất Excel
          </a>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            summary.assigned === 0
              ? "Chưa giao cho đại lý nào"
              : filter === "joined"
                ? "Chưa có đại lý nào bấm tham gia"
                : "Không có đại lý"
          }
          description={summary.assigned === 0 ? "Bấm \"Giao cho đại lý\" để đại lý thấy buổi training này." : undefined}
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <SttHead />
                <SortableHead column="code" sort={sort}>Mã</SortableHead>
                <SortableHead column="name" sort={sort}>Đại lý</SortableHead>
                <TableHead>Người dùng</TableHead>
                <SortableHead column="region" sort={sort}>Khu vực</SortableHead>
                <SortableHead column="joinedAt" sort={sort}>Bấm tham gia lúc</SortableHead>
                <ActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.dealerId} data-testid={`attendance-${r.code}`}>
                  <SttCell n={offset + i + 1} />
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <div>{r.userName ?? <EmptyValue>Chưa có tài khoản</EmptyValue>}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </TableCell>
                  <TableCell>{r.region ?? <EmptyValue>Chưa phân vùng</EmptyValue>}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.joinedAt ? (
                      <ToneBadge tone="success">{formatDateTime(r.joinedAt)}</ToneBadge>
                    ) : (
                      <ToneBadge tone="muted">Chưa tham gia</ToneBadge>
                    )}
                  </TableCell>
                  <ActionsCell>
                    {r.assigned && (
                      <ConfirmAction
                        action={unassignSessionAction.bind(null, session.id, r.dealerId)}
                        title="Bỏ giao buổi training?"
                        description={`Đại lý ${r.code} sẽ không thấy buổi training này nữa.`}
                        confirmLabel="Bỏ giao"
                        destructive
                        trigger={
                          <ActionIcon label="Bỏ giao" tone="danger">
                            <UserMinus className="size-4" />
                          </ActionIcon>
                        }
                      />
                    )}
                  </ActionsCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={size} total={total} className="border-t" />
        </div>
      )}
    </>
  );
}
