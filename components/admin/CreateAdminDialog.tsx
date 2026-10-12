"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CredentialNotice } from "@/components/admin/CredentialNotice";
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
import { createAdminAction } from "@/lib/actions/admin/users";

export function CreateAdminDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setError(null);
      const res = await createAdminAction({ name, email });
      if (res.error) {
        setError(res.error);
        return;
      }
      setCreated({ email: res.email!, password: res.tempPassword! });
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setName("");
          setEmail("");
          setCreated(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Thêm quản trị viên
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm quản trị viên</DialogTitle>
          <DialogDescription>Quản trị viên có toàn quyền nghiệp vụ. Mật khẩu tạm được sinh tự động.</DialogDescription>
        </DialogHeader>
        {created ? (
          <CredentialNotice email={created.email} password={created.password} />
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Họ tên" required>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field label="Email đăng nhập" required>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Đang tạo…" : "Tạo tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
