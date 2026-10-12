"use client";

import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuestionGrid({
  ids,
  current,
  answered,
  flagged,
  failed,
  onSelect,
}: {
  ids: string[];
  current: number;
  answered: (id: string) => boolean;
  flagged: Set<string>;
  failed: (id: string) => boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-success" /> Đã trả lời
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-gray-300" /> Chưa trả lời
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand" /> Đang làm
        </span>
        <span className="flex items-center gap-1.5">
          <Flag className="size-3 text-amber-500" /> Đánh dấu
        </span>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {ids.map((id, i) => {
          const isCurrent = i === current;
          const done = answered(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`Câu ${i + 1}${done ? ", đã trả lời" : ""}`}
              aria-current={isCurrent}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-full text-sm font-medium transition",
                isCurrent
                  ? "bg-brand text-white ring-2 ring-brand/30"
                  : done
                    ? "bg-success-soft text-success hover:ring-2 hover:ring-success/30"
                    : "bg-muted text-foreground/70 hover:bg-gray-200",
                failed(id) && "ring-2 ring-red-400"
              )}
            >
              {i + 1}
              {flagged.has(id) && <Flag className="absolute -right-0.5 -top-0.5 size-3 fill-amber-400 text-amber-500" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
