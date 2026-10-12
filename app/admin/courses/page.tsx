import { Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/date-utils";
import { CONTENT_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Khóa đào tạo — Kymdan" };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }>;
}) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const allCourses = await prisma.course.findMany({
    where: {
      ...(sp.status ? { status: sp.status } : { status: { not: "archived" } }),
      ...(sp.q?.trim() ? { title: { contains: sp.q.trim() } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      _count: { select: { materials: true, sessions: true, enrollments: true } },
      enrollments: { where: { completedAt: { not: null } }, select: { id: true } },
    },
  });
  const { items: courses, page, total } = paginate(allCourses, parsePage(sp.page), size);

  return (
    <div>
      <PageHeader
        title="Khóa đào tạo"
        actions={
          <Button asChild>
            <Link href="/admin/courses/new">
              <Plus className="size-4" /> Tạo khóa học
            </Link>
          </Button>
        }
      />
      <FilterBar
        basePath="/admin/courses"
        q={sp.q}
        placeholder="Tìm theo tên khóa học…"
        selects={[
          {
            name: "status",
            label: "Chưa lưu trữ",
            value: sp.status,
            options: Object.entries(CONTENT_STATUS).map(([value, l]) => ({ value, label: l.text })),
          },
        ]}
      />
      {courses.length === 0 ? (
        <EmptyState title="Chưa có khóa học" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Khóa học</TableHead>
                <TableHead className="text-right">Tài liệu</TableHead>
                <TableHead className="text-right">Buổi training</TableHead>
                <TableHead className="text-right">Hoàn thành / Được giao</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-brand">
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{c._count.materials}</TableCell>
                  <TableCell className="text-right">{c._count.sessions}</TableCell>
                  <TableCell className="text-right">
                    {c.enrollments.length}/{c._count.enrollments}
                  </TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge map={CONTENT_STATUS} value={c.status} />
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
