"use client";

import { KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CredentialNotice } from "@/components/admin/CredentialNotice";
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

export function ResetPasswordButton({
  label,
  action,
}: {
  label: string;
  action: () => Promise<{ error?: string; tempPassword?: string; email?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await action();
      if (res.error || !res.tempPassword) {
        toast.error(res.error ?? "Không cấp lại được mật khẩu");
        return;
      }
      setResult({ email: res.email ?? "", password: res.tempPassword });
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" title="Cấp lại mật khẩu" aria-label="Cấp lại mật khẩu">
          <KeyRound className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấp lại mật khẩu</DialogTitle>
          <DialogDescription>
            Tạo mật khẩu tạm mới cho <b>{label}</b>. Mật khẩu cũ sẽ không dùng được nữa.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <CredentialNotice email={result.email} password={result.password} />
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={run} disabled={pending}>
              {pending ? "Đang tạo…" : "Cấp mật khẩu tạm"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
