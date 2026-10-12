"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { saveExamAction, type ExamInput } from "@/lib/actions/admin/exams";
import { POLICY_LABEL } from "@/lib/labels";

export const EXAM_DEFAULTS: ExamInput = {
  title: "",
  description: "",
  questionCount: 30,
  durationMinutes: 45,
  passMarkPercent: 70,
  startsAt: "",
  endsAt: "",
  selectionMode: "random",
  shuffleOptions: true,
  showScorePolicy: "after_submit",
  showAnswerPolicy: "after_exam_ends",
  showLeaderboard: false,
};

export function ExamForm({ id, initial, locked }: { id: string | null; initial?: ExamInput; locked: boolean }) {
  const [form, setForm] = useState<ExamInput>(initial ?? EXAM_DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = <K extends keyof ExamInput>(key: K, value: ExamInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveExamAction(id, form);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("Đã lưu kỳ thi");
      if (!id && "id" in res && res.id) router.replace(`/admin/exams/${res.id}?tab=questions`);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6">
      {locked && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-amber-800">
          Kỳ thi đã có lượt làm bài: số câu, thời lượng, điểm đạt và cách chọn đề bị khóa để bảo đảm công bằng.
        </p>
      )}
      <Field label="Tên kỳ thi" required>
        <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </Field>
      <Field label="Mô tả">
        <textarea className={textareaClass} value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Số câu mỗi đề" required hint="Mặc định 30">
          <input type="number" min={1} className={inputClass} value={form.questionCount} disabled={locked} onChange={(e) => set("questionCount", Number(e.target.value))} />
        </Field>
        <Field label="Thời lượng (phút)" required hint="Mặc định 45">
          <input type="number" min={1} className={inputClass} value={form.durationMinutes} disabled={locked} onChange={(e) => set("durationMinutes", Number(e.target.value))} />
        </Field>
        <Field label="Điểm đạt (%)" required hint="Mặc định 70">
          <input type="number" min={0} max={100} className={inputClass} value={form.passMarkPercent} disabled={locked} onChange={(e) => set("passMarkPercent", Number(e.target.value))} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mở lúc" hint="Giờ Việt Nam. Để trống = mở ngay khi xuất bản">
          <input type="datetime-local" className={inputClass} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label="Đóng lúc" hint="Đại lý bắt đầu sát giờ đóng sẽ bị nộp tự động lúc đóng">
          <input type="datetime-local" className={inputClass} value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cách chọn đề">
          <select
            className={inputClass}
            value={form.selectionMode}
            disabled={locked}
            onChange={(e) => set("selectionMode", e.target.value as "fixed" | "random")}
          >
            <option value="random">Ngẫu nhiên từ bộ câu hỏi (mỗi đại lý một đề)</option>
            <option value="fixed">Cố định theo thứ tự bộ câu hỏi</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={form.shuffleOptions} onChange={(e) => set("shuffleOptions", e.target.checked)} className="size-4 accent-red-600" />
          Trộn thứ tự đáp án cho từng đại lý
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hiển thị điểm">
          <select className={inputClass} value={form.showScorePolicy} onChange={(e) => set("showScorePolicy", e.target.value as ExamInput["showScorePolicy"])}>
            {Object.entries(POLICY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hiển thị đáp án">
          <select className={inputClass} value={form.showAnswerPolicy} onChange={(e) => set("showAnswerPolicy", e.target.value as ExamInput["showAnswerPolicy"])}>
            {Object.entries(POLICY_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
        <input
          type="checkbox"
          checked={Boolean(form.showLeaderboard)}
          onChange={(e) => set("showLeaderboard", e.target.checked)}
          className="mt-0.5 size-4 accent-red-600"
        />
        <span>
          <span className="font-medium">Công khai bảng xếp hạng cho đại lý</span>
          <span className="block text-xs text-muted-foreground">
            Sau khi kỳ thi kết thúc, đại lý xem được top 10 (tên đại lý, khu vực, điểm). Nếu tắt, đại lý chỉ thấy hạng của chính mình.
            Quản trị viên luôn xem được bảng xếp hạng đầy đủ.
          </span>
        </span>
      </label>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : id ? "Lưu cấu hình" : "Tạo kỳ thi"}
        </Button>
      </div>
    </form>
  );
}
