"use client";

import { CheckCircle2, CloudOff, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/date-utils";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({
  saving,
  failed,
  lastSavedAt,
}: {
  saving: number;
  failed: number;
  lastSavedAt: Date | null;
}) {
  if (failed > 0) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-red-700">
        <CloudOff className="size-4" /> {failed} câu chưa lưu — đang thử lại
      </span>
    );
  }
  if (saving > 0) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Đang lưu…
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="size-4" /> Đã lưu lúc {formatTime(lastSavedAt)}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">Đáp án được lưu tự động</span>;
}
