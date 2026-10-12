"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { saveQuestionAction, type QuestionInput } from "@/lib/actions/admin/questions";
import { DIFFICULTY } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface OptionDraft {
  key: string;
  id?: string;
  text: string;
  isCorrect: boolean;
}

let counter = 0;
const newKey = () => `n${++counter}`;

export function QuestionForm({
  id,
  initial,
  categories,
  published,
}: {
  id: string | null;
  initial?: { categoryId: string; stem: string; explanation: string; difficulty: number; options: { id: string; text: string; isCorrect: boolean }[] };
  categories: { id: string; name: string }[];
  published: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [stem, setStem] = useState(initial?.stem ?? "");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 2);
  const [options, setOptions] = useState<OptionDraft[]>(
    initial?.options.map((o) => ({ key: o.id, id: o.id, text: o.text, isCorrect: o.isCorrect })) ??
      Array.from({ length: 4 }, (_, i) => ({ key: newKey(), text: "", isCorrect: i === 0 }))
  );

  const update = (key: string, patch: Partial<OptionDraft>) =>
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, ...patch } : o)));

  const markCorrect = (key: string) => setOptions((prev) => prev.map((o) => ({ ...o, isCorrect: o.key === key })));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input: QuestionInput = {
      categoryId,
      stem,
      explanation,
      difficulty,
      options: options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
    };
    start(async () => {
      const res = await saveQuestionAction(id, input);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("Đã lưu câu hỏi");
      if (!id && "id" in res && res.id) router.replace(`/admin/questions/${res.id}`);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-5 rounded-2xl border bg-card p-6">
      {published && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-amber-800">
          Câu hỏi đã xuất bản: sửa nội dung sẽ tăng version. Lượt thi đã tạo vẫn chấm theo bản snapshot cũ.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Chủ đề" required>
          <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Độ khó" required>
          <select className={inputClass} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}>
            {Object.entries(DIFFICULTY).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Nội dung câu hỏi" required>
        <textarea className={textareaClass} value={stem} onChange={(e) => setStem(e.target.value)} rows={3} required />
      </Field>

      <div>
        <p className="mb-2 text-sm font-medium">
          Lựa chọn <span className="text-brand">*</span>{" "}
          <span className="font-normal text-muted-foreground">— chọn ô tròn ở đáp án đúng (trắc nghiệm một đáp án)</span>
        </p>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.key} className={cn("flex items-center gap-2 rounded-lg border p-2", o.isCorrect && "border-success bg-success-soft/50")}>
              <input
                type="radio"
                name="correct"
                checked={o.isCorrect}
                onChange={() => markCorrect(o.key)}
                className="size-4 accent-green-600"
                aria-label={`Đáp án đúng ${String.fromCharCode(65 + i)}`}
              />
              <span className="w-5 text-sm font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              <input
                className={cn(inputClass, "flex-1")}
                value={o.text}
                onChange={(e) => update(o.key, { text: e.target.value })}
                placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                required
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setOptions((prev) => prev.filter((x) => x.key !== o.key))}
                disabled={options.length <= 2}
                aria-label="Xóa lựa chọn"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        {options.length < 6 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => setOptions((prev) => [...prev, { key: newKey(), text: "", isCorrect: false }])}
          >
            <Plus className="size-4" /> Thêm lựa chọn
          </Button>
        )}
      </div>

      <Field label="Giải thích" hint="Hiển thị cho đại lý khi luyện tập và khi kỳ thi công bố đáp án">
        <textarea className={textareaClass} value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
      </Field>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/admin/questions")}>
          Quay lại
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu câu hỏi"}
        </Button>
      </div>
    </form>
  );
}
