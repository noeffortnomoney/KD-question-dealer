import type { Prisma } from "@prisma/client";
import { CalendarDays, CalendarX2, ClipboardCheck, Pencil, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { SessionDialog } from "@/components/admin/SessionDialog";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { ActionIcon, ActionsCell, ActionsHead, IconLines, RowLink, SortableHead } from "@/components/common/TableParts";
import { parseSort, type SortState } from "@/lib/sort";
import { setSessionStatusAction } from "@/lib/actions/admin/sessions";
import { formatDate, formatDateTime, formatTime, toDateTimeLocalValue } from "@/lib/date-utils";
import { SESSION_PHASE_LABEL, sessionPhase } from "@/lib/session-status";
import { prisma } from "@/lib/prisma";
import { listRegions } from "@/lib/queries/dealers";
import { Pagination } from "@/components/common/Pagination";
import { clampPage, parsePage, parsePageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch training — Kymdan" };

const SORT_KEYS = ["createdAt", "startsAt", "title", "materials", "attendances"] as const;

function sessionOrder(sort: SortState<(typeof SORT_KEYS)[number]>): Prisma.TrainingSessionOrderByWithRelationInput[] {
  const d = sort.dir;
  if (sort.key === "title") return [{ title: d }, { createdAt: "desc" }];
  if (sort.key === "materials") return [{ materials: { _count: d } }, { createdAt: "desc" }];
  if (sort.key === "attendances") return [{ attendances: { _count: d } }, { createdAt: "desc" }];
  if (sort.key === "startsAt") return [{ startsAt: d }, { createdAt: "desc" }];
  return [{ createdAt: d }];
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; page?: string; size?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const scope = sp.scope ?? "upcoming";
  const sort = parseSort(sp, SORT_KEYS, { key: "createdAt", dir: "desc" });
  const size = parsePageSize(sp.size);
  const now = new Date();
  const where = scope === "past" ? { endsAt: { lt: now } } : scope === "all" ? {} : { endsAt: { gte: now } };
  const [total, regions] = await Promise.all([prisma.trainingSession.count({ where }), listRegions()]);
  const page = clampPage(parsePage(sp.page), total, size);
  const sessions = await prisma.trainingSession.findMany({
    where,
    orderBy: sessionOrder(sort),
    skip: (page - 1) * size,
    take: size,
    select: {
      id: true,
      title: true,
      description: true,
      presenterName: true,
      startsAt: true,
      endsAt: true,
      meetUrl: true,
      status: true,
      createdAt: true,
      _count: { select: { attendances: true, assignments: true, materials: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Lịch training"
        description="Các buổi Google Meet giữa công ty và đại lý. Mỗi buổi giao cho tất cả, theo khu vực hoặc theo danh sách đại lý."
        actions={
          <SessionDialog
            regions={regions}
            trigger={
              <Button>
                <Plus className="size-4" /> Thêm buổi training
              </Button>
            }
          />
        }
      />
      <div className="mb-4 flex gap-2">
        {[
          { k: "upcoming", l: "Sắp diễn ra" },
          { k: "past", l: "Đã diễn ra" },
          { k: "all", l: "Tất cả" },
        ].map((t) => (
          <Link
            key={t.k}
            href={`/admin/training-sessions?scope=${t.k}`}
            className={cn("rounded-full px-4 py-1.5 text-sm font-medium", scope === t.k ? "bg-brand text-white" : "bg-card hover:bg-brand-soft")}
          >
            {t.l}
          </Link>
        ))}
      </div>
      {sessions.length === 0 ? (
        <EmptyState title="Không có buổi training" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <SttHead />
                <SortableHead column="startsAt" sort={sort}>Thời gian</SortableHead>
                <SortableHead column="title" sort={sort}>Buổi training</SortableHead>
                <SortableHead column="materials" sort={sort} firstDir="desc" align="right">Tài liệu</SortableHead>
                <SortableHead column="attendances" sort={sort} firstDir="desc" align="right">Tham gia / Được giao</SortableHead>
                <TableHead>Trạng thái</TableHead>
                <SortableHead column="createdAt" sort={sort} firstDir="desc">Ngày tạo</SortableHead>
                <ActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s, i) => (
                <TableRow key={s.id}>
                  <SttCell n={(page - 1) * size + i + 1} />
                  <TableCell>
                    <IconLines
                      icon={<CalendarDays className="size-4 text-brand" />}
                      primary={formatDate(s.startsAt)}
                      secondary={`${formatTime(s.startsAt)} → ${formatTime(s.endsAt)}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Link href={`/admin/training-sessions/${s.id}`} className="font-medium hover:text-brand">
                      {s.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">{s.presenterName}</div>
                    {s._count.assignments === 0 && <div className="mt-0.5 text-xs text-amber-700">Chưa giao cho đại lý nào — đại lý chưa thấy</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s._count.materials}</TableCell>
                  <TableCell className="text-right tabular-nums" data-testid="session-joined">
                    <div className="font-medium">
                      {s._count.attendances}/{s._count.assignments}
                    </div>
                    <div className="ml-auto mt-1 h-1.5 w-20 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-success"
                        style={{ width: `${s._count.assignments ? Math.round((s._count.attendances / s._count.assignments) * 100) : 0}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={SESSION_PHASE_LABEL} value={sessionPhase(s)} />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(s.createdAt)}</TableCell>
                  <ActionsCell>
                      <RowLink href={`/admin/training-sessions/${s.id}`} icon={<ClipboardCheck className="size-3.5" />}>
                        Điểm danh
                      </RowLink>
                      <SessionDialog
                        sessionId={s.id}
                        initial={{
                          title: s.title,
                          description: s.description ?? "",
                          presenterName: s.presenterName ?? "",
                          startsAt: toDateTimeLocalValue(s.startsAt),
                          endsAt: toDateTimeLocalValue(s.endsAt),
                          meetUrl: s.meetUrl,
                        }}
                        trigger={
                          <ActionIcon label="Sửa" tone="edit">
                            <Pencil className="size-4" />
                          </ActionIcon>
                        }
                      />
                      {s.status === "scheduled" ? (
                        <ConfirmAction
                          action={setSessionStatusAction.bind(null, s.id, "cancelled")}
                          title="Hủy buổi training?"
                          description="Đại lý sẽ không thấy buổi này nữa."
                          confirmLabel="Hủy buổi"
                          destructive
                          trigger={
                            <ActionIcon label="Hủy buổi" tone="danger">
                              <CalendarX2 className="size-4" />
                            </ActionIcon>
                          }
                        />
                      ) : s.status === "cancelled" ? (
                        <ConfirmAction
                          action={setSessionStatusAction.bind(null, s.id, "scheduled")}
                          title="Khôi phục buổi training?"
                          description="Buổi training hiển thị lại cho đại lý."
                          confirmLabel="Khôi phục"
                          trigger={
                            <ActionIcon label="Khôi phục" tone="success">
                              <RotateCcw className="size-4" />
                            </ActionIcon>
                          }
                        />
                      ) : null}
                  </ActionsCell>
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
