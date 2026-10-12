"use client";

import { ChevronLeft, ChevronRight, NotebookPen, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { OptionList } from "@/components/exam/OptionList";
import { Button } from "@/components/ui/button";
import type { PracticeItem, PracticeView } from "@/lib/practice";
import { cn } from "@/lib/utils";

export function PracticeRunner({ initial }: { initial: PracticeView }) {
  const [items, setItems] = useState<PracticeItem[]>(initial.items);
  const firstOpen = initial.items.findIndex((i) => !i.answered);
  const [current, setCurrent] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [pending, setPending] = useState(false);

  const item = items[current];
  const answered = items.filter((i) => i.answered).length;
  const correct = items.filter((i) => i.isCorrect).length;
  const finished = answered === items.length;

  const answer = async (optionId: string) => {
    if (item.answered || pending) return;
    setPending(true);
    setItems((prev) => prev.map((x, i) => (i === current ? { ...x, selectedOptionId: optionId } : x)));
    try {
      const res = await fetch(`/api/practice/sessions/${initial.sessionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: item.questionId, selectedOptionId: optionId }),
      });
      const data = (await res.json()) as PracticeItem & { error?: string };
      if (!res.ok) throw new Error(data.error);
      setItems((prev) => prev.map((x, i) => (i === current ? data : x)));
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Không gửi được câu trả lời");
      setItems((prev) => prev.map((x, i) => (i === current ? { ...x, selectedOptionId: null } : x)));
    }
    setPending(false);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-5 text-brand" />
          <span className="font-semibold">Luyện tập: {initial.categoryName ?? "Tất cả chủ đề"}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            Câu {current + 1}/{items.length}
          </span>
          <span className="text-success">
            Đúng {correct}/{answered}
          </span>
        </div>
      </div>
      <div className="mb-4 h-1.5 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: `${(answered / items.length) * 100}%` }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <section className="rounded-xl border bg-card p-6">
          <p className="mb-1 text-sm font-semibold text-brand">Câu {current + 1}</p>
          <p className="mb-5 text-base font-medium leading-relaxed">{item.stem}</p>
          <OptionList
            name={item.questionId}
            options={item.options}
            selectedOptionId={item.selectedOptionId}
            onSelect={answer}
            disabled={item.answered || pending}
            correctOptionId={item.answered ? item.correctOptionId : undefined}
          />
          {item.answered && (
            <div className={cn("mt-4 rounded-lg px-4 py-3 text-sm", item.isCorrect ? "bg-success-soft" : "bg-red-50")}>
              <p className={cn("font-semibold", item.isCorrect ? "text-success" : "text-red-700")}>
                {item.isCorrect ? "Chính xác!" : "Chưa đúng"}
              </p>
              {item.explanation && <p className="mt-1">{item.explanation}</p>}
            </div>
          )}
          <div className="mt-6 flex justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
              <ChevronLeft className="size-4" /> Câu trước
            </Button>
            <Button onClick={() => setCurrent((c) => Math.min(items.length - 1, c + 1))} disabled={current === items.length - 1}>
              Câu tiếp theo <ChevronRight className="size-4" />
            </Button>
          </div>
        </section>

        <aside className="rounded-xl border bg-card p-4 lg:self-start">
          <div className="grid grid-cols-5 gap-2">
            {items.map((x, i) => (
              <button
                key={x.questionId}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full text-sm font-medium",
                  i === current
                    ? "bg-brand text-white"
                    : x.answered
                      ? x.isCorrect
                        ? "bg-success-soft text-success"
                        : "bg-red-50 text-red-700"
                      : "bg-muted"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {finished && (
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
              <p className="font-semibold">Hoàn thành lượt luyện tập</p>
              <p className="text-muted-foreground">
                Đúng {correct}/{items.length} câu ({Math.round((correct / items.length) * 100)}%)
              </p>
              <Button asChild size="sm" className="mt-3 w-full">
                <Link href="/practice">
                  <RotateCcw className="size-4" /> Luyện tập lượt mới
                </Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
