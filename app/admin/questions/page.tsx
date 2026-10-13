import type { Prisma } from "@prisma/client";
import { Pencil, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { clampPage, parsePage, parsePageSize } from "@/lib/pagination";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { ActionIcon, ActionsCell, ActionsHead, SortableHead } from "@/components/common/TableParts";
import { parseSort, type SortState } from "@/lib/sort";
import { formatDate } from "@/lib/date-utils";
import { isGuid } from "@/lib/ids";
import { CONTENT_STATUS, DIFFICULTY, DIFFICULTY_TONE } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ngân hàng câu hỏi — Kymdan" };

type SP = { q?: string; category?: string; status?: string; difficulty?: string; page?: string; size?: string; sort?: string; dir?: string };

const SORT_KEYS = ["created", "stem", "category", "difficulty", "status", "exams"] as const;

function questionOrder(sort: SortState<(typeof SORT_KEYS)[number]>): Prisma.QuestionOrderByWithRelationInput[] {
  const d = sort.dir;
  const by: Record<(typeof SORT_KEYS)[number], Prisma.QuestionOrderByWithRelationInput> = {
    created: { createdAt: d },
    stem: { stem: d },
    category: { category: { name: d } },
    difficulty: { difficulty: d },
    status: { status: d },
    exams: { examQuestions: { _count: d } },
  };
  return sort.key === "created" ? [by.created] : [by[sort.key], { createdAt: "desc" }];
}

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const sort = parseSort(sp, SORT_KEYS, { key: "created", dir: "desc" });
  const where: Prisma.QuestionWhereInput = {
    ...(sp.category && isGuid(sp.category) ? { categoryId: sp.category } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.difficulty ? { difficulty: Number(sp.difficulty) } : {}),
    ...(sp.q?.trim() ? { stem: { contains: sp.q.trim() } } : {}),
  };
  const total = await prisma.question.count({ where });
  const page = clampPage(parsePage(sp.page), total, size);

  const [questions, categories, counts, statusCounts] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: questionOrder(sort),
      skip: (page - 1) * size,
      take: size,
      select: {
        id: true,
        stem: true,
        status: true,
        difficulty: true,
        version: true,
        createdAt: true,
        category: { select: { name: true } },
        _count: { select: { options: true, examQuestions: true } },
      },
    }),
    prisma.questionCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.question.groupBy({ by: ["categoryId"], _count: { _all: true } }),
    prisma.question.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (status: string) => statusCounts.find((s) => s.status === status)?._count._all ?? 0;

  return (
    <div>
      <PageHeader
        title="Ngân hàng câu hỏi"
        description={`${countOf("published")} đã xuất bản · ${countOf("draft")} bản nháp · ${countOf("archived")} lưu trữ`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/questions/import">
                <Upload className="size-4" /> Import Excel/CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/questions/new">
                <Plus className="size-4" /> Thêm câu hỏi
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <FilterBar
            basePath="/admin/questions"
            q={sp.q}
            hidden={{ sort: sp.sort, dir: sp.dir }}
            placeholder="Tìm theo nội dung câu hỏi…"
            selects={[
              { name: "category", label: "Tất cả chủ đề", value: sp.category, options: categories.map((c) => ({ value: c.id, label: c.name })) },
              {
                name: "status",
                label: "Mọi trạng thái",
                value: sp.status,
                options: Object.entries(CONTENT_STATUS).map(([value, l]) => ({ value, label: l.text })),
              },
              {
                name: "difficulty",
                label: "Mọi độ khó",
                value: sp.difficulty,
                options: Object.entries(DIFFICULTY).map(([value, label]) => ({ value, label })),
              },
            ]}
          />
          {questions.length === 0 ? (
            <EmptyState title="Không có câu hỏi" />
          ) : (
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SttHead />
                    <SortableHead column="stem" sort={sort} className="w-[50%]">Câu hỏi</SortableHead>
                    <SortableHead column="category" sort={sort}>Chủ đề</SortableHead>
                    <SortableHead column="difficulty" sort={sort}>Độ khó</SortableHead>
                    <SortableHead column="status" sort={sort}>Trạng thái</SortableHead>
                    <SortableHead column="exams" sort={sort} firstDir="desc" align="right">Trong kỳ thi</SortableHead>
                    <SortableHead column="created" sort={sort} firstDir="desc">Ngày tạo</SortableHead>
                    <ActionsHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q, i) => (
                    <TableRow key={q.id}>
                      <SttCell n={(page - 1) * size + i + 1} />
                      <TableCell className="whitespace-normal">
                        <Link href={`/admin/questions/${q.id}`} className="line-clamp-2 font-medium hover:text-brand">
                          {q.stem}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {q._count.options} lựa chọn · v{q.version}
                        </span>
                      </TableCell>
                      <TableCell>{q.category.name}</TableCell>
                      <TableCell>
                        <ToneBadge tone={DIFFICULTY_TONE[q.difficulty] ?? "muted"}>{DIFFICULTY[q.difficulty] ?? q.difficulty}</ToneBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge map={CONTENT_STATUS} value={q.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{q._count.examQuestions}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(q.createdAt)}</TableCell>
                      <ActionsCell>
                        <ActionIcon label="Sửa câu hỏi" tone="edit" asChild>
                          <Link href={`/admin/questions/${q.id}`}>
                            <Pencil className="size-4" />
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
        <CategoryManager
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            sortOrder: c.sortOrder,
            count: counts.find((x) => x.categoryId.toLowerCase() === c.id.toLowerCase())?._count._all ?? 0,
          }))}
        />
      </div>
    </div>
  );
}
