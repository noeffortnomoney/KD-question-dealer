import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { SortableHead } from "@/components/common/TableParts";
import { parseSort, sortRows } from "@/lib/sort";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { visibility } from "@/lib/exam/policy";
import { formatScore } from "@/lib/format";
import { ATTEMPT_STATUS_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kết quả của tôi — Kymdan" };

const SORT_KEYS = ["startedAt", "exam", "score"] as const;

export default async function MyResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; sort?: string; dir?: string }>;
}) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const sort = parseSort(sp, SORT_KEYS, { key: "startedAt", dir: "desc" });
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const now = new Date();

  const allAttempts = await prisma.examAttempt.findMany({
    where: { dealerId: g.dealerId },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      attemptNo: true,
      startedAt: true,
      finishedAt: true,
      scorePercent: true,
      isPassed: true,
      exam: { select: { title: true, status: true, startsAt: true, endsAt: true, showScorePolicy: true } },
    },
  });
  const scoreVisible = (a: (typeof allAttempts)[number]) =>
    (a.status === "Submitted" || a.status === "Expired") && visibility(a.exam.showScorePolicy, a.exam, now).visible;
  const sorted = sortRows(
    allAttempts,
    (a) => ({ startedAt: a.startedAt, exam: a.exam.title, score: scoreVisible(a) ? a.scorePercent : null })[sort.key],
    sort.dir
  );
  const attemptPage = paginate(sorted, parsePage(sp.page), size);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Kết quả của tôi" description="Lịch sử các lượt thi chính thức" />
      {allAttempts.length === 0 ? (
        <EmptyState title="Chưa có lượt thi" action={<Button asChild><Link href="/exams">Xem kỳ thi</Link></Button>} />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <SttHead />
                <SortableHead column="exam" sort={sort}>Kỳ thi</SortableHead>
                <SortableHead column="startedAt" sort={sort} firstDir="desc">Bắt đầu</SortableHead>
                <TableHead>Trạng thái</TableHead>
                <SortableHead column="score" sort={sort} firstDir="desc" align="right">Điểm</SortableHead>
                <TableHead className="text-right">Kết quả</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attemptPage.items.map((a, i) => {
                const graded = a.status === "Submitted" || a.status === "Expired";
                const show = scoreVisible(a);
                return (
                  <TableRow key={a.id}>
                    <SttCell n={attemptPage.offset + i + 1} />
                    <TableCell className="font-medium">
                      {a.exam.title}
                      {a.attemptNo > 1 && <span className="ml-1 text-xs text-muted-foreground">(lượt {a.attemptNo})</span>}
                    </TableCell>
                    <TableCell>{formatDateTime(a.startedAt)}</TableCell>
                    <TableCell>
                      <StatusBadge map={ATTEMPT_STATUS_LABEL} value={a.status} />
                    </TableCell>
                    <TableCell className="text-right">{show ? `${formatScore(a.scorePercent)}/100` : "—"}</TableCell>
                    <TableCell className="text-right">
                      {show ? (
                        <span className={a.isPassed ? "font-semibold text-success" : "font-semibold text-red-600"}>
                          {a.isPassed ? "Đạt" : "Không đạt"}
                        </span>
                      ) : graded ? (
                        <span className="text-xs text-muted-foreground">Chưa công bố</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.status === "InProgress" ? (
                        <Button asChild size="sm">
                          <Link href={`/attempts/${a.id}`}>Tiếp tục</Link>
                        </Button>
                      ) : a.status !== "Voided" ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/attempts/${a.id}/result`}>Chi tiết</Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination page={attemptPage.page} pageSize={size} total={attemptPage.total} className="border-t" />
        </div>
      )}
    </div>
  );
}
