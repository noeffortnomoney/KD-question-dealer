import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default async function MyResultsPage({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
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
  const attemptPage = paginate(allAttempts, parsePage(sp.page), size);

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
                <TableHead>Kỳ thi</TableHead>
                <TableHead>Bắt đầu</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Điểm</TableHead>
                <TableHead className="text-right">Kết quả</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attemptPage.items.map((a) => {
                const graded = a.status === "Submitted" || a.status === "Expired";
                const show = graded && visibility(a.exam.showScorePolicy, a.exam, now).visible;
                return (
                  <TableRow key={a.id}>
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
