"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { addExamQuestionsAction } from "@/lib/actions/admin/exams";

export function AddExamQuestions({
  examId,
  categories,
  candidates,
  categoryId,
}: {
  examId: string;
  categories: { id: string; name: string }[];
  candidates: { id: string; stem: string }[];
  categoryId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (input: { questionIds?: string[]; categoryId?: string }) =>
    start(async () => {
      const res = await addExamQuestionsAction(examId, input);
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.message ?? "Đã thêm");
        setSelected(new Set());
        router.refresh();
      }
    });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold">Thêm câu hỏi đã xuất bản</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className={inputClass + " max-w-xs"}
          value={categoryId}
          onChange={(e) => router.replace(`/admin/exams/${examId}?tab=questions&category=${e.target.value}`)}
        >
          <option value="">Tất cả chủ đề</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {categoryId && (
          <Button variant="outline" onClick={() => run({ categoryId })} disabled={pending || candidates.length === 0}>
            Thêm tất cả trong chủ đề ({candidates.length})
          </Button>
        )}
        <Button onClick={() => run({ questionIds: [...selected] })} disabled={pending || selected.size === 0}>
          Thêm {selected.size} câu đã chọn
        </Button>
      </div>
      <div className="mt-3 max-h-80 space-y-1 overflow-auto">
        {candidates.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Không còn câu hỏi đã xuất bản nào chưa có trong bộ đề.</p>
        ) : (
          candidates.map((q) => (
            <label key={q.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
              <input type="checkbox" className="mt-1 accent-red-600" checked={selected.has(q.id)} onChange={() => toggle(q.id)} />
              <span>{q.stem}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
