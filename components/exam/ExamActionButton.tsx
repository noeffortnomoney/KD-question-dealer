import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { DealerExamItem } from "@/lib/exam/engine";

export function ExamActionButton({ exam, size = "default" }: { exam: DealerExamItem; size?: "default" | "sm" }) {
  switch (exam.state) {
    case "can_start":
      return (
        <Button asChild size={size}>
          <Link href={`/exams/${exam.examId}`}>Vào thi</Link>
        </Button>
      );
    case "reissued":
      return (
        <Button asChild size={size}>
          <Link href={`/exams/${exam.examId}`}>Thi lại</Link>
        </Button>
      );
    case "in_progress":
      return (
        <Button asChild size={size} className="bg-amber-500 hover:bg-amber-600">
          <Link href={`/attempts/${exam.attemptId}`}>Tiếp tục làm bài</Link>
        </Button>
      );
    case "finished":
      return (
        <Button asChild size={size} variant="outline">
          <Link href={`/attempts/${exam.attemptId}/result`}>Xem kết quả</Link>
        </Button>
      );
    case "not_open":
      return (
        <Button size={size} variant="outline" disabled>
          Chưa mở
        </Button>
      );
    default:
      return (
        <Button size={size} variant="outline" disabled>
          Đã đóng
        </Button>
      );
  }
}

export const EXAM_STATE_LABEL: Record<DealerExamItem["state"], { text: string; tone: "brand" | "success" | "warning" | "muted" | "info" }> = {
  can_start: { text: "Chưa làm", tone: "warning" },
  reissued: { text: "Được cấp lại lượt", tone: "brand" },
  in_progress: { text: "Đang làm", tone: "warning" },
  finished: { text: "Đã hoàn thành", tone: "success" },
  not_open: { text: "Sắp mở", tone: "info" },
  closed: { text: "Đã đóng", tone: "muted" },
};
