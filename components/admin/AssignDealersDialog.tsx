"use client";

import { UserPlus } from "lucide-react";
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
import type { AssignInput } from "@/lib/assign";
import { cn } from "@/lib/utils";

export function AssignDealersDialog({
  title,
  regions,
  action,
}: {
  title: string;
  regions: string[];
  action: (input: AssignInput) => Promise<{ error?: string; message?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AssignInput["mode"]>("all");
  const [region, setRegion] = useState(regions[0] ?? "");
  const [codes, setCodes] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () =>
    start(async () => {
      const input: AssignInput = mode === "all" ? { mode } : mode === "region" ? { mode, region } : { mode, codes };
      const res = await action(input);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Đã giao");
      setOpen(false);
      setCodes("");
      router.refresh();
    });

  const MODES: { key: AssignInput["mode"]; label: string }[] = [
    { key: "all", label: "Tất cả đại lý đang hoạt động" },
    { key: "region", label: "Theo khu vực" },
    { key: "codes", label: "Theo danh sách mã" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" /> Giao cho đại lý
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Đại lý đã được giao trước đó sẽ được giữ nguyên.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {MODES.map((m) => (
            <label
              key={m.key}
              className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm", mode === m.key && "border-brand bg-brand-soft")}
            >
              <input type="radio" name="assign-mode" checked={mode === m.key} onChange={() => setMode(m.key)} className="accent-red-600" />
              {m.label}
            </label>
          ))}
        </div>
        {mode === "region" && (
          <Field label="Khu vực">
            <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        )}
        {mode === "codes" && (
          <Field label="Mã đại lý" hint="Cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng">
            <textarea className={textareaClass} value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="HCM001, HN001" />
          </Field>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={pending || (mode === "region" && !region)}>
            {pending ? "Đang giao…" : "Giao"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
