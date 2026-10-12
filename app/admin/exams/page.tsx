import { Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/date-utils";
import { EXAM_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý kỳ thi — Kymdan" };

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string }> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const allExams = await prisma.exam.findMany({
    where: {
      ...(sp.status ? { status: sp.status } : { status: { not: "archived" } }),
      ...(sp.q?.trim() ? { title: { contains: sp.q.trim() } } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      questionCount: true,
      durationMinutes: true,
      passMarkPercent: true,
      _count: { select: { questions: true, assignments: true, attempts: true } },
    },
  });
  const { items: exams, page, total } = paginate(allExams, parsePage(sp.page), size);

  return (
    <div>
      <PageHeader
        title="Quản lý kỳ thi"
        description="Kỳ thi chính thức: mỗi đại lý một lượt hợp lệ"
        actions={
          <Button asChild>
            <Link href="/admin/exams/new">
              <Plus className="size-4" /> Tạo kỳ thi
            </Link>
          </Button>
        }
      />
      <FilterBar
        basePath="/admin/exams"
        q={sp.q}
        placeholder="Tìm theo tên kỳ thi…"
        selects={[
          {
            name: "status",
            label: "Chưa lưu trữ",
            value: sp.status,
            options: Object.entries(EXAM_STATUS).map(([value, l]) => ({ value, label: l.text })),
          },
        ]}
      />
      {exams.length === 0 ? (
        <EmptyState title="Chưa có kỳ thi" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kỳ thi</TableHead>
                <TableHead>Lịch thi</TableHead>
                <TableHead>Cấu hình</TableHead>
                <TableHead className="text-right">Bộ câu hỏi</TableHead>
                <TableHead className="text-right">Đại lý</TableHead>
                <TableHead className="text-right">Lượt thi</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/admin/exams/${e.id}`} className="font-medium hover:text-brand">
                      {e.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDateTime(e.startsAt, "Ngay khi mở")}
                    <br />→ {formatDateTime(e.endsAt, "Không giới hạn")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.questionCount} câu · {e.durationMinutes} phút · đạt {e.passMarkPercent}%
                  </TableCell>
                  <TableCell className="text-right">{e._count.questions}</TableCell>
                  <TableCell className="text-right">{e._count.assignments}</TableCell>
                  <TableCell className="text-right">
                    {e._count.attempts > 0 ? (
                      <Link href={`/admin/reports?exam=${e.id}`} className="text-brand hover:underline">
                        {e._count.attempts}
                      </Link>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={EXAM_STATUS} value={e.status} />
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
