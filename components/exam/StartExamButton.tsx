"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function StartExamButton({ examId }: { examId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  const start = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/exams/${examId}/attempts`, { method: "POST", cache: "no-store" });
      const data = (await res.json()) as { attemptId?: string; error?: string };
      if (res.ok && data.attemptId) {
        router.push(`/attempts/${data.attemptId}`);
        return;
      }
      toast.error(data.error ?? "Không bắt đầu được bài thi");
      setPending(false);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Mất kết nối. Vui lòng thử lại.");
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <DialogTrigger asChild>
        <Button className="h-11 px-6 text-base">Bắt đầu làm bài</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bắt đầu bài thi chính thức?</DialogTitle>
          <DialogDescription>
            Đồng hồ sẽ chạy ngay khi bạn xác nhận và lượt thi được tính là đã sử dụng. Hãy chắc chắn bạn có kết nối mạng
            ổn định và đủ thời gian.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Chưa sẵn sàng
          </Button>
          <Button onClick={start} disabled={pending}>
            {pending ? "Đang chuẩn bị đề…" : "Bắt đầu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
