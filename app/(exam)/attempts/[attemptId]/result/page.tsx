import { Check, Clock, Hourglass, Send, X } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OptionList } from "@/components/exam/OptionList";
import { Button } from "@/components/ui/button";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime, formatDuration } from "@/lib/date-utils";
import { getResultForDealer } from "@/lib/exam/engine";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kết quả thi — Kymdan" };

export default async function ResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) redirect("/login");
  const { attemptId } = await params;

  const result = await getResultForDealer(attemptId, guard.dealerId);
  if (!result.ok) {
    if (result.code === "ATTEMPT_IN_PROGRESS") redirect(`/attempts/${attemptId}`);
    notFound();
  }
  const r = result.data;
  const expired = r.status === "Expired";
  const voided = r.status === "Voided";

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="rounded-2xl border bg-card p-6 text-center sm:p-10">
        <div className="relative mx-auto flex size-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-success/15" />
          <span className={cn("relative flex size-16 items-center justify-center rounded-full text-white", voided ? "bg-gray-400" : "bg-success")}>
            {voided ? <X className="size-9" /> : <Check className="size-9" strokeWidth={3} />}
          </span>
        </div>
        <h1 className="mt-5 text-2xl font-bold">
          {voided
            ? "Lượt thi này đã được hủy"
            : expired
              ? "Đã hết giờ — bài thi đã được nộp tự động"
              : "Bạn đã hoàn thành bài thi!"}
        </h1>
        <p className="mt-1 text-muted-foreground">{r.examTitle}</p>

        {!voided && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-success-soft/70 p-5">
              <p className="text-sm text-muted-foreground">Điểm số</p>
              {r.score.visible ? (
                <p className="mt-1 text-4xl font-bold text-success">
                  {formatScore(r.score.scorePercent)}
                  <span className="text-2xl">/100</span>
                </p>
              ) : (
                <p className="mt-2 text-sm">
                  {r.score.availableAtUtc
                    ? `Điểm sẽ được công bố sau ${formatDateTime(r.score.availableAtUtc)}`
                    : "Điểm chưa được công bố"}
                </p>
              )}
              {r.score.visible && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Đúng {r.score.correct}/{r.score.total} câu · Điểm đạt {r.score.passMarkPercent}%
                </p>
              )}
            </div>
            <div className={cn("flex items-center justify-between rounded-xl p-5", r.score.isPassed === false ? "bg-red-50" : "bg-success-soft/70")}>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">Kết quả</p>
                <p className={cn("mt-1 text-4xl font-bold", r.score.isPassed === false ? "text-red-600" : "text-success")}>
                  {r.score.visible ? (r.score.isPassed ? "Đạt" : "Không đạt") : "—"}
                </p>
              </div>
              {r.score.visible && (
                <span className={cn("flex size-12 items-center justify-center rounded-full text-white", r.score.isPassed ? "bg-success" : "bg-red-500")}>
                  {r.score.isPassed ? <Check className="size-7" strokeWidth={3} /> : <X className="size-7" strokeWidth={3} />}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 text-left text-sm sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Hourglass className="size-5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Thời gian làm bài</p>
              <p className="font-semibold">{r.durationSeconds !== null ? formatDuration(r.durationSeconds) : "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Send className="size-5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{expired ? "Kết thúc lúc" : "Thời gian nộp"}</p>
              <p className="font-semibold">{formatDateTime(r.submittedAtUtc ?? r.finishedAtUtc)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="size-5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Số câu đã trả lời</p>
              <p className="font-semibold">
                {r.answeredCount}/{r.totalQuestions}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {r.answers.visible && (
            <Button asChild variant="outline">
              <a href="#review">Xem chi tiết</a>
            </Button>
          )}
          {r.score.visible && !voided && (
            <Button asChild variant="outline">
              <Link href={`/exams/${r.examId}/ranking`}>Xem xếp hạng</Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/dashboard">Về trang chủ</Link>
          </Button>
        </div>
        {!r.answers.visible && !voided && (
          <p className="mt-4 text-xs text-muted-foreground">
            {r.answers.availableAtUtc
              ? `Đáp án sẽ được công bố sau ${formatDateTime(r.answers.availableAtUtc)}.`
              : "Đáp án của kỳ thi này không được công bố."}
          </p>
        )}
      </div>

      {r.answers.visible && r.answers.items && (
        <section id="review" className="mt-8 space-y-4">
          <h2 className="text-lg font-bold">Chi tiết bài làm</h2>
          {r.answers.items.map((item) => (
            <div key={item.order} className="rounded-xl border bg-card p-5">
              <p className="mb-3 font-medium">
                <span className="mr-2 text-brand">Câu {item.order}.</span>
                {item.stem}
              </p>
              <OptionList
                name={`review-${item.order}`}
                options={item.options}
                selectedOptionId={item.selectedOptionId}
                correctOptionId={item.correctOptionId}
                disabled
              />
              {!item.selectedOptionId && <p className="mt-2 text-xs text-amber-700">Bạn chưa trả lời câu này.</p>}
              {item.explanation && (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
                  <b>Giải thích:</b> {item.explanation}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
