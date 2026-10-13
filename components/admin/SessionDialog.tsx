"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
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
import { createSessionAction, updateSessionAction, type SessionInput } from "@/lib/actions/admin/sessions";
import type { AssignInput } from "@/lib/assign";
import { cn } from "@/lib/utils";

const EMPTY: SessionInput = { title: "", description: "", presenterName: "", startsAt: "", endsAt: "", meetUrl: "" };

const ASSIGN_MODES: { key: AssignInput["mode"]; label: string }[] = [
  { key: "all", label: "Tất cả đại lý đang hoạt động" },
  { key: "region", label: "Theo khu vực" },
  { key: "codes", label: "Theo danh sách mã" },
];

export function SessionDialog({
  sessionId,
  initial,
  regions = [],
  trigger,
}: {
  sessionId?: string;
  initial?: SessionInput;
  regions?: string[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SessionInput>(initial ?? EMPTY);
  const [mode, setMode] = useState<AssignInput["mode"]>("all");
  const [region, setRegion] = useState(regions[0] ?? "");
  const [codes, setCodes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const set = (key: keyof SessionInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      if (sessionId) {
        const res = await updateSessionAction(sessionId, form);
        if (res.error) {
          setError(res.error);
          return;
        }
        toast.success(res.message ?? "Đã lưu");
        setOpen(false);
        router.refresh();
        return;
      }
      const assign: AssignInput = mode === "all" ? { mode } : mode === "region" ? { mode, region } : { mode, codes };
      const res = await createSessionAction(form, assign);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(res.message ?? "Đã lưu");
      setOpen(false);
      setForm(EMPTY);
      setCodes("");
      if ("id" in res && res.id) router.push(`/admin/training-sessions/${res.id}?tab=materials`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sessionId ? "Sửa buổi training" : "Thêm buổi training"}</DialogTitle>
          <DialogDescription>Thời gian theo giờ Việt Nam. Đại lý thấy nút tham gia trước giờ bắt đầu 15 phút.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Tiêu đề" required>
            <input className={inputClass} value={form.title} onChange={set("title")} required />
          </Field>
          <Field label="Nội dung" hint="Tóm tắt nội dung buổi training, đại lý thấy trong lịch">
            <textarea className={textareaClass} value={form.description} onChange={set("description")} />
          </Field>
          <Field label="Người trình bày">
            <input className={inputClass} value={form.presenterName} onChange={set("presenterName")} placeholder="VD: Phòng Kinh doanh" />
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
          {!sessionId && (
            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-sm font-medium">
                Giao cho đại lý<span className="ml-0.5 text-brand">*</span>
              </legend>
              {ASSIGN_MODES.map((m) => (
                <label
                  key={m.key}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm", mode === m.key && "border-brand bg-brand-soft")}
                >
                  <input type="radio" name="session-assign-mode" checked={mode === m.key} onChange={() => setMode(m.key)} className="accent-red-600" />
                  {m.label}
                </label>
              ))}
              {mode === "region" && (
                <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Khu vực">
                  {regions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              )}
              {mode === "codes" && (
                <textarea
                  className={textareaClass}
                  value={codes}
                  onChange={(e) => setCodes(e.target.value)}
                  placeholder="HCM001, HN001"
                  aria-label="Mã đại lý"
                />
              )}
            </fieldset>
          )}
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={pending || (!sessionId && mode === "region" && !region)}>
              {pending ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
