import { AlertTriangle, CheckCircle2, Clock, FileQuestion, Target } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StartExamButton } from "@/components/exam/StartExamButton";
import { ExamActionButton } from "@/components/exam/ExamActionButton";
import { Button } from "@/components/ui/button";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { listDealerExams } from "@/lib/exam/engine";
import { isGuid } from "@/lib/ids";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hướng dẫn trước khi thi — Kymdan" };

const RULES = [
  "Mỗi kỳ thi chính thức chỉ có một lượt làm bài. Khi đã bắt đầu, lượt thi được tính là đã sử dụng.",
  "Thời gian tính theo đồng hồ máy chủ, bắt đầu ngay khi bạn bấm “Bắt đầu làm bài”. Đóng trình duyệt không làm dừng đồng hồ.",
  "Đáp án được lưu tự động sau mỗi lần chọn. Chỉ những câu hiển thị “Đã lưu” mới chắc chắn được ghi nhận.",
  "Nếu mất kết nối hoặc lỡ tắt trang, hãy đăng nhập lại để tiếp tục đúng bài đang làm khi vẫn còn thời gian.",
  "Hết giờ, hệ thống tự nộp bài và chấm theo các câu đã lưu.",
];

export default async function ExamIntroPage({ params }: { params: Promise<{ examId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) redirect("/login");
  const { examId } = await params;
  if (!isGuid(examId)) notFound();

  const [exam] = await listDealerExams(guard.dealerId, examId);
  if (!exam) notFound();
  if (exam.state === "in_progress") redirect(`/attempts/${exam.attemptId}`);

  const endsAt = exam.endsAtUtc ? new Date(exam.endsAtUtc) : null;
  const minutesLeft = endsAt ? Math.floor((endsAt.getTime() - Date.now()) / 60_000) : null;
  const shortWindow = minutesLeft !== null && minutesLeft < exam.durationMinutes;
  const canStart = exam.state === "can_start" || exam.state === "reissued";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/exams" className="text-sm text-muted-foreground hover:text-brand">
        ← Danh sách kỳ thi
      </Link>
      <div className="mt-3 rounded-2xl border bg-card p-6 sm:p-8">
        <p className="text-sm font-medium text-brand">Hướng dẫn trước khi thi</p>
        <h1 className="mt-1 text-2xl font-bold">{exam.title}</h1>
        {exam.description && <p className="mt-2 text-muted-foreground">{exam.description}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
            <FileQuestion className="size-6 text-brand" />
            <div>
              <p className="text-xs text-muted-foreground">Số câu</p>
              <p className="font-semibold">{exam.questionCount} câu</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
            <Clock className="size-6 text-brand" />
            <div>
              <p className="text-xs text-muted-foreground">Thời gian</p>
              <p className="font-semibold">{exam.durationMinutes} phút</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
            <Target className="size-6 text-brand" />
            <div>
              <p className="text-xs text-muted-foreground">Điểm đạt</p>
              <p className="font-semibold">{exam.passMarkPercent}%</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Kỳ thi mở từ {formatDateTime(exam.startsAtUtc, "bây giờ")} đến {formatDateTime(exam.endsAtUtc, "khi có thông báo")}.
        </p>

        <h2 className="mt-6 font-semibold">Quy định</h2>
        <ul className="mt-3 space-y-2">
          {RULES.map((rule) => (
            <li key={rule} className="flex gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              {rule}
            </li>
          ))}
        </ul>

        {canStart && shortWindow && (
          <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-warning-soft p-4 text-sm text-amber-800">
            <AlertTriangle className="size-5 shrink-0" />
            Kỳ thi sẽ đóng sau khoảng {Math.max(0, minutesLeft ?? 0)} phút, ít hơn thời gian làm bài. Nếu bắt đầu bây giờ,
            bài sẽ được nộp tự động lúc kỳ thi đóng.
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {canStart ? (
            <StartExamButton examId={exam.examId} />
          ) : (
            <ExamActionButton exam={exam} />
          )}
          <Button asChild variant="outline">
            <Link href="/dashboard">Để sau</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
