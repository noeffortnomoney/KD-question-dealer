import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatTime } from "@/lib/date-utils";
import { SESSION_PHASE_LABEL, sessionPhase } from "@/lib/session-status";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/common/Pagination";
import { clampPage, parsePage, parsePageSize } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch training — Kymdan" };

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const scope = sp.scope ?? "upcoming";
  const size = parsePageSize(sp.size);
  const now = new Date();
  const where = scope === "past" ? { endsAt: { lt: now } } : scope === "all" ? {} : { endsAt: { gte: now } };
  const total = await prisma.trainingSession.count({ where });
  const page = clampPage(parsePage(sp.page), total, size);
  const sessions = await prisma.trainingSession.findMany({
    where,
    orderBy: { startsAt: scope === "past" ? "desc" : "asc" },
    skip: (page - 1) * size,
    take: size,
    select: {
      id: true,
      title: true,
      presenterName: true,
      startsAt: true,
      endsAt: true,
      status: true,
      course: { select: { id: true, title: true, status: true, _count: { select: { enrollments: true } } } },
      _count: { select: { attendances: true } },
    },
  });

  return (
    <div>
      <PageHeader title="Lịch training" description="Tất cả buổi training Google Meet. Thêm/sửa buổi trong từng khóa học." />
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
                <TableHead>Thời gian</TableHead>
                <TableHead>Buổi training</TableHead>
                <TableHead>Khóa học</TableHead>
                <TableHead className="text-right">Tham gia / Được giao</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">
                    {formatDateTime(s.startsAt)} – {formatTime(s.endsAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">{s.presenterName}</div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/courses/${s.course.id}?tab=sessions`} className="hover:text-brand">
                      {s.course.title}
                    </Link>
                    {s.course.status !== "published" && (
                      <div className="mt-0.5 text-xs text-amber-700">Khóa học chưa xuất bản — đại lý chưa thấy</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/training-sessions/${s.id}`} className="font-medium text-brand hover:underline">
                      {s._count.attendances}/{s.course._count.enrollments} · Điểm danh
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={SESSION_PHASE_LABEL} value={sessionPhase(s)} />
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
