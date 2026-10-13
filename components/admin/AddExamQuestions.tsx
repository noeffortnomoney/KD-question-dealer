"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { addExamQuestionsAction } from "@/lib/actions/admin/exams";

export function AddExamQuestions({
  examId,
  categories,
  candidates,
  total,
  categoryId,
  q,
}: {
  examId: string;
  categories: { id: string; name: string }[];
  candidates: { id: string; stem: string }[];
  total: number;
  categoryId: string;
  q: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState(q);
  const [pending, start] = useTransition();
  const [filtering, startFilter] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectAllRef = useRef<HTMLInputElement>(null);

  const visibleSelected = candidates.filter((c) => selected.has(c.id)).length;
  const allVisibleSelected = candidates.length > 0 && visibleSelected === candidates.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = visibleSelected > 0 && !allVisibleSelected;
  }, [visibleSelected, allVisibleSelected]);

  const applyFilter = (next: { category?: string; q?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "questions");
    params.delete("page");
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startFilter(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  useEffect(() => {
    if (query.trim() === q) return;
    const t = setTimeout(() => applyFilter({ q: query.trim() }), 350);
    return () => clearTimeout(t);
  });

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

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of candidates) {
        if (allVisibleSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="font-semibold">Thêm câu hỏi đã xuất bản</h3>
      <div className="mt-3 space-y-2">
        <select
          className={inputClass}
          value={categoryId}
          onChange={(e) => applyFilter({ category: e.target.value })}
          aria-label="Chủ đề"
        >
          <option value="">Tất cả chủ đề</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            className={inputClass + " pl-9"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyFilter({ q: query.trim() });
              }
            }}
            maxLength={200}
            placeholder="Tìm nội dung câu hỏi…"
            aria-label="Tìm câu hỏi"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run({ questionIds: [...selected] })} disabled={pending || selected.size === 0}>
            Thêm {selected.size} câu đã chọn
          </Button>
          {categoryId && !q && (
            <Button variant="outline" onClick={() => run({ categoryId })} disabled={pending || total === 0}>
              Thêm tất cả trong chủ đề ({total})
            </Button>
          )}
        </div>
      </div>

      {candidates.length > 0 && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 border-b px-2 pb-2 text-sm font-medium">
          <input
            ref={selectAllRef}
            type="checkbox"
            className="accent-red-600"
            checked={allVisibleSelected}
            onChange={toggleAll}
            aria-label="Chọn tất cả"
          />
          Chọn tất cả ({candidates.length} câu)
          {selected.size > visibleSelected && (
            <span className="ml-auto text-xs font-normal text-muted-foreground">+{selected.size - visibleSelected} câu chọn ở bộ lọc khác</span>
          )}
        </label>
      )}

      {total > candidates.length && (
        <p className="mt-2 rounded-md bg-warning-soft px-2 py-1.5 text-xs text-amber-900">
          Đang hiển thị {candidates.length}/{total} câu. Lọc theo chủ đề hoặc tìm kiếm để thu hẹp.
        </p>
      )}

      <div className={"mt-1 max-h-80 space-y-1 overflow-auto" + (filtering ? " opacity-60" : "")}>
        {candidates.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {q ? `Không có câu hỏi nào khớp "${q}".` : "Không còn câu hỏi đã xuất bản nào chưa có trong bộ đề."}
          </p>
        ) : (
          candidates.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
              <input type="checkbox" className="mt-1 accent-red-600" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <span>{c.stem}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
