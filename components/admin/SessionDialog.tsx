"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveSessionAction, type SessionInput } from "@/lib/actions/admin/courses";

const EMPTY: SessionInput = { title: "", presenterName: "", startsAt: "", endsAt: "", meetUrl: "" };

export function SessionDialog({
  courseId,
  sessionId,
  initial,
  trigger,
}: {
  courseId: string;
  sessionId?: string;
  initial?: SessionInput;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SessionInput>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = (key: keyof SessionInput) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveSessionAction(courseId, sessionId ?? null, form);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(res.message ?? "Đã lưu");
      setOpen(false);
      if (!sessionId) setForm(EMPTY);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sessionId ? "Sửa buổi training" : "Thêm buổi training"}</DialogTitle>
          <DialogDescription>Thời gian theo giờ Việt Nam. Đại lý thấy nút tham gia trước giờ bắt đầu 15 phút.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Tiêu đề" required>
            <input className={inputClass} value={form.title} onChange={set("title")} required />
          </Field>
          <Field label="Người trình bày">
            <input className={inputClass} value={form.presenterName} onChange={set("presenterName")} placeholder="VD: Phòng Đào tạo" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bắt đầu" required>
              <input type="datetime-local" className={inputClass} value={form.startsAt} onChange={set("startsAt")} required />
            </Field>
            <Field label="Kết thúc" required>
              <input type="datetime-local" className={inputClass} value={form.endsAt} onChange={set("endsAt")} required />
            </Field>
          </div>
          <Field label="Link Google Meet" required>
            <input type="url" className={inputClass} value={form.meetUrl} onChange={set("meetUrl")} placeholder="https://meet.google.com/xxx-xxxx-xxx" required />
          </Field>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
