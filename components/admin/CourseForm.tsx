"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { saveCourseAction } from "@/lib/actions/admin/courses";

export function CourseForm({ id, initial }: { id: string | null; initial?: { title: string; description: string } }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveCourseAction(id, { title, description });
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("Đã lưu khóa học");
      if (!id && "id" in res && res.id) router.replace(`/admin/courses/${res.id}?tab=materials`);
      else router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      <Field label="Tên khóa học" required>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Mô tả">
        <textarea className={textareaClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : id ? "Lưu" : "Tạo khóa học"}
        </Button>
      </div>
    </form>
  );
}
