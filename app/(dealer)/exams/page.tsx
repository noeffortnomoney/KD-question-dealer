import { FileText, Medal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ToneBadge } from "@/components/common/StatusBadge";
import { EXAM_STATE_LABEL, ExamActionButton } from "@/components/exam/ExamActionButton";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { listDealerExams } from "@/lib/exam/engine";
import { formatScore } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kỳ thi — Kymdan" };

export default async function DealerExamsPage() {
  const guard = await requireDealer();
  if ("error" in guard) redirect("/login");
  const exams = await listDealerExams(guard.dealerId);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Kỳ thi" description="Các kỳ thi chính thức bạn được giao. Mỗi kỳ thi chỉ có một lượt làm bài." />
      {exams.length === 0 ? (
        <EmptyState title="Chưa có kỳ thi" description="Khi quản trị viên giao kỳ thi cho bạn, kỳ thi sẽ xuất hiện ở đây." />
      ) : (
        <div className="space-y-3">
          {exams.map((e) => {
            const label = EXAM_STATE_LABEL[e.state];
            return (
              <div key={e.examId} data-exam-card={e.title} className="card-lift flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <FileText className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{e.title}</h2>
                    <ToneBadge tone={label.tone}>{label.text}</ToneBadge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {e.questionCount} câu hỏi · {e.durationMinutes} phút · Điểm đạt {e.passMarkPercent}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mở: {formatDateTime(e.startsAtUtc, "ngay")} — Đóng: {formatDateTime(e.endsAtUtc, "không giới hạn")}
                  </p>
                  {e.score.visible && (
                    <p className="mt-1 text-sm">
                      Điểm: <b>{formatScore(e.score.scorePercent)}/100</b> ·{" "}
                      <span className={e.score.isPassed ? "text-success" : "text-red-600"}>
                        {e.score.isPassed ? "Đạt" : "Không đạt"}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.rankingAvailable && (
                    <Button asChild variant="outline">
                      <Link href={`/exams/${e.examId}/ranking`}>
                        <Medal className="size-4 text-amber-500" /> Xếp hạng
                      </Link>
                    </Button>
                  )}
                  <ExamActionButton exam={e} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
