import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ToneBadge } from "@/components/common/StatusBadge";
import { PracticeStart } from "@/components/practice/PracticeStart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";
import { PRACTICE_SIZES, listPracticeCategories, listPracticeHistory } from "@/lib/practice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Luyện tập — Kymdan" };

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const [categories, history] = await Promise.all([listPracticeCategories(), listPracticeHistory(g.dealerId, 1000)]);
  const historyPage = paginate(history, parsePage(sp.page), size);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Luyện tập câu hỏi"
        description="Ôn tập không giới hạn số lần. Đáp án và giải thích hiện ngay sau mỗi câu."
      />
      <PracticeStart categories={categories} sizes={PRACTICE_SIZES} />

      <section>
        <h2 className="mb-3 text-lg font-bold">Lịch sử luyện tập</h2>
        {history.length === 0 ? (
          <EmptyState title="Chưa có lượt luyện tập" />
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chủ đề</TableHead>
                  <TableHead>Bắt đầu</TableHead>
                  <TableHead className="text-right">Kết quả</TableHead>
                  <TableHead className="text-right">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyPage.items.map((h) => (
                  <TableRow key={h.sessionId}>
                    <TableCell>
                      <Link href={`/practice/${h.sessionId}`} className="font-medium hover:text-brand">
                        {h.categoryName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDateTime(h.startedAt)}</TableCell>
                    <TableCell className="text-right">
                      {h.correctCount}/{h.answeredCount} đúng
                    </TableCell>
                    <TableCell className="text-right">
                      {h.finishedAt ? (
                        <ToneBadge tone="success">Hoàn thành</ToneBadge>
                      ) : (
                        <ToneBadge tone="warning">
                          Đang làm {h.answeredCount}/{h.questionCount}
                        </ToneBadge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={historyPage.page} pageSize={size} total={historyPage.total} className="border-t" />
          </div>
        )}
      </section>
    </div>
  );
}
