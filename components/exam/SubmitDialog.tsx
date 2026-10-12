"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function SubmitDialog({
  open,
  onOpenChange,
  answered,
  total,
  unsaved,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answered: number;
  total: number;
  unsaved: number;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-md text-center">
        <AlertCircle className="mx-auto size-14 text-brand" />
        <DialogTitle className="text-center text-xl font-bold text-brand">Xác nhận nộp bài</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Bạn đã trả lời <b className="text-foreground">{answered}/{total}</b> câu hỏi.
              {answered < total && <> Còn {total - answered} câu chưa trả lời.</>}
            </p>
            {unsaved > 0 && <p className="text-red-700">Còn {unsaved} câu đang chờ lưu, hệ thống sẽ lưu trước khi nộp.</p>}
            <p>Sau khi nộp bài, bạn sẽ không thể thay đổi câu trả lời. Bạn có chắc chắn muốn nộp bài?</p>
          </div>
        </DialogDescription>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Hủy
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Đang nộp…" : "Nộp bài"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
