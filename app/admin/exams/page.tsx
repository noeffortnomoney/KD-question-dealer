import { BarChart3, CalendarDays, FileText, Plus, Settings2, Trophy } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { ActionIcon, ActionsCell, ActionsHead, IconLines, RowLink, SortableHead } from "@/components/common/TableParts";
import { formatDateTime } from "@/lib/date-utils";
import { parseSort, sortRows } from "@/lib/sort";
import { EXAM_PHASE_LABEL, EXAM_PHASE_ORDER, examPhase, examPhaseWhere, isExamPhase } from "@/lib/exam-status";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý kỳ thi — Kymdan" };

const SORT_KEYS = ["created", "title", "startsAt", "duration", "questions", "assignments", "attempts", "status"] as const;

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; size?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const sort = parseSort(sp, SORT_KEYS, { key: "created", dir: "desc" });
  const now = new Date();
  const allExams = await prisma.exam.findMany({
    where: {
      ...(isExamPhase(sp.status) ? examPhaseWhere(sp.status, now) : { status: { not: "archived" } }),
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
      createdAt: true,
      _count: { select: { questions: true, assignments: true, attempts: true } },
    },
  });
  const sorted = sortRows(
    allExams,
    (e) =>
      ({
        created: e.createdAt,
        title: e.title,
        startsAt: e.startsAt,
        duration: e.durationMinutes,
        questions: e._count.questions,
        assignments: e._count.assignments,
        attempts: e._count.attempts,
        status: EXAM_PHASE_ORDER[examPhase(e, now)],
      })[sort.key],
    sort.dir
  );
  const { items: exams, page, total, offset } = paginate(sorted, parsePage(sp.page), size);

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
        hidden={{ sort: sp.sort, dir: sp.dir }}
        placeholder="Tìm theo tên kỳ thi…"
        selects={[
          {
            name: "status",
            label: "Chưa lưu trữ",
            value: sp.status,
            options: Object.entries(EXAM_PHASE_LABEL).map(([value, l]) => ({ value, label: l.text })),
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
                <SttHead />
                <SortableHead column="title" sort={sort}>Kỳ thi</SortableHead>
                <SortableHead column="startsAt" sort={sort} firstDir="desc">Lịch thi</SortableHead>
                <SortableHead column="duration" sort={sort}>Cấu hình</SortableHead>
                <SortableHead column="questions" sort={sort} firstDir="desc" align="right">Bộ câu hỏi</SortableHead>
                <SortableHead column="assignments" sort={sort} firstDir="desc" align="right">Đại lý</SortableHead>
                <SortableHead column="attempts" sort={sort} firstDir="desc" align="right">Lượt thi</SortableHead>
                <SortableHead column="status" sort={sort}>Trạng thái</SortableHead>
                <SortableHead column="created" sort={sort} firstDir="desc">Ngày tạo</SortableHead>
                <ActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e, i) => (
                <TableRow key={e.id}>
                  <SttCell n={offset + i + 1} />
                  <TableCell>
                    <Link href={`/admin/exams/${e.id}`} className="font-medium hover:text-brand">
                      {e.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <IconLines
                      icon={<CalendarDays className="size-4 text-brand" />}
                      primary={e.startsAt ? formatDateTime(e.startsAt) : "Ngay khi mở"}
                      secondary={`→ ${e.endsAt ? formatDateTime(e.endsAt) : "Không giới hạn"}`}
                    />
                  </TableCell>
                  <TableCell>
                    <IconLines
                      icon={<FileText className="size-4 text-foreground/60" />}
                      primary={`${e.questionCount} câu · ${e.durationMinutes} phút`}
                      secondary={`Đạt ${e.passMarkPercent}%`}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={e._count.questions < e.questionCount ? "font-semibold text-amber-700" : undefined}>
                      {e._count.questions}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{e._count.assignments}</TableCell>
                  <TableCell className="text-right tabular-nums">{e._count.attempts}</TableCell>
                  <TableCell>
                    <StatusBadge map={EXAM_PHASE_LABEL} value={examPhase(e, now)} />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(e.createdAt)}</TableCell>
                  <ActionsCell>
                    <RowLink href={`/admin/exams/${e.id}`} icon={<Settings2 className="size-3.5" />}>
                      Quản lý
                    </RowLink>
                    {e._count.attempts > 0 ? (
                      <ActionIcon label="Kết quả & báo cáo" tone="edit" asChild>
                        <Link href={`/admin/reports?exam=${e.id}`}>
                          <BarChart3 className="size-4" />
                        </Link>
                      </ActionIcon>
                    ) : (
                      <ActionIcon label="Chưa có bài thi" tone="neutral" disabled>
                        <BarChart3 className="size-4" />
                      </ActionIcon>
                    )}
                    <ActionIcon label="Bảng xếp hạng" tone="neutral" asChild>
                      <Link href={`/admin/exams/${e.id}?tab=ranking`}>
                        <Trophy className="size-4" />
                      </Link>
                    </ActionIcon>
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
