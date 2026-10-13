"use client";

import { KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CredentialNotice } from "@/components/admin/CredentialNotice";
import { Field, inputClass } from "@/components/common/Field";
import { ActionIcon } from "@/components/common/TableParts";
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
import { DEFAULT_PASSWORD, PASSWORD_MIN_LENGTH, passwordProblem } from "@/lib/password-rules";

export function ResetPasswordButton({
  label,
  action,
}: {
  label: string;
  action: (newPassword: string) => Promise<{ error?: string; tempPassword?: string; email?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    start(async () => {
      const res = await action(password);
      if (res.error || !res.tempPassword) {
        toast.error(res.error ?? "Không cấp lại được mật khẩu");
        return;
      }
      setResult({ email: res.email ?? "", password: res.tempPassword });
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setResult(null);
          setError(null);
          setPassword(DEFAULT_PASSWORD);
        }
      }}
    >
      <DialogTrigger asChild>
        <ActionIcon label="Cấp lại mật khẩu" tone="neutral">
          <KeyRound className="size-4" />
        </ActionIcon>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấp lại mật khẩu</DialogTitle>
          <DialogDescription>
            Đặt mật khẩu mới cho <b>{label}</b>. Mật khẩu cũ sẽ không dùng được nữa.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <CredentialNotice email={result.email} password={result.password} />
        ) : (
          <form onSubmit={run} className="space-y-4">
            <Field label="Mật khẩu mới" required hint={`Mặc định ${DEFAULT_PASSWORD}. Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`}>
              <input
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                aria-label="Mật khẩu mới"
              />
            </Field>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Hủy
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Đang lưu…" : "Cấp lại mật khẩu"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
