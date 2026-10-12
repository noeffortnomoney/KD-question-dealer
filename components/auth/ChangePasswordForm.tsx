"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "@/lib/actions/auth";

export function ChangePasswordForm({ homePath, forced }: { homePath: string; forced: boolean }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { update } = useSession();
  const router = useRouter();

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await changePasswordAction(form);
      if (res.error) {
        setError(res.error);
        return;
      }
      await update({ mustChangePassword: false });
      toast.success("Đã đổi mật khẩu");
      router.replace(homePath);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Field label={forced ? "Mật khẩu tạm được cấp" : "Mật khẩu hiện tại"} required>
        <input type="password" autoComplete="current-password" className={inputClass} value={form.currentPassword} onChange={set("currentPassword")} required />
      </Field>
      <Field label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự, có cả chữ và số">
        <input type="password" autoComplete="new-password" className={inputClass} value={form.newPassword} onChange={set("newPassword")} required />
      </Field>
      <Field label="Nhập lại mật khẩu mới" required>
        <input type="password" autoComplete="new-password" className={inputClass} value={form.confirmPassword} onChange={set("confirmPassword")} required />
      </Field>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        {!forced && (
          <Button asChild variant="outline" className="flex-1">
            <Link href={homePath}>Quay lại</Link>
          </Button>
        )}
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Đang lưu…" : "Lưu mật khẩu"}
        </Button>
      </div>
    </form>
  );
}
