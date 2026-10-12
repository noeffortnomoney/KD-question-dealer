"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function Countdown({ remainingMs }: { remainingMs: number }) {
  const danger = remainingMs <= 60_000;
  const warn = remainingMs <= 5 * 60_000;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5",
        danger ? "bg-red-50 text-red-700" : warn ? "bg-warning-soft text-amber-700" : "text-brand"
      )}
      aria-live="polite"
    >
      <Clock className="size-5" />
      <div className="leading-tight">
        <div className="text-[11px] text-muted-foreground">Thời gian còn lại</div>
        <div className={cn("font-mono text-xl font-bold tabular-nums", danger && "animate-pulse")}>
          {formatClock(remainingMs)}
        </div>
      </div>
    </div>
  );
}
