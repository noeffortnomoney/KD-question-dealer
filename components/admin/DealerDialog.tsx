"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { createDealerAction, updateDealerAction, type DealerInput } from "@/lib/actions/admin/dealers";

const EMPTY: DealerInput = { code: "", name: "", phone: "", region: "", userName: "", email: "" };

export function DealerDialog({
  trigger,
  dealerId,
  initial,
  regions,
}: {
  trigger: React.ReactNode;
  dealerId?: string;
  initial?: DealerInput;
  regions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DealerInput>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const isEdit = Boolean(dealerId);

  const set = (key: keyof DealerInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setForm(initial ?? EMPTY);
      setError(null);
      setConfirming(false);
      setCreated(null);
    }
  };

  const save = () =>
    start(async () => {
      setError(null);
      const res = isEdit ? await updateDealerAction(dealerId!, form) : await createDealerAction(form);
      if (res.error) {
        setError(res.error);
        setConfirming(false);
        return;
      }
      router.refresh();
      const credentials = res as { tempPassword?: string; email?: string };
      if (!isEdit && credentials.tempPassword) {
        setCreated({ email: credentials.email ?? "", password: credentials.tempPassword });
        toast.success("Đã thêm đại lý");
        return;
      }
      toast.success("Đã lưu thay đổi");
      reset(false);
    });

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa đại lý" : "Thêm đại lý mới"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Cập nhật thông tin đại lý và tài khoản đăng nhập." : "Hệ thống tự sinh mật khẩu tạm cho tài khoản mới."}
          </DialogDescription>
        </DialogHeader>

        {created ? (
          <CredentialNotice email={created.email} password={created.password} />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConfirming(true);
            }}
            className="space-y-5"
          >
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold text-brand">Thông tin đại lý</legend>
              <Field label="Mã đại lý" required>
                <input className={inputClass} value={form.code} onChange={set("code")} placeholder="VD: HCM001" required />
              </Field>
              <Field label="Tên đại lý" required>
                <input className={inputClass} value={form.name} onChange={set("name")} placeholder="Nhập tên đại lý" required />
              </Field>
              <Field label="Số điện thoại">
                <input className={inputClass} value={form.phone} onChange={set("phone")} placeholder="Nhập số điện thoại" />
              </Field>
              <Field label="Khu vực">
                <input className={inputClass} value={form.region} onChange={set("region")} list="dealer-regions" placeholder="VD: TP. Hồ Chí Minh" />
                <datalist id="dealer-regions">
                  {regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold text-brand">Tài khoản đăng nhập</legend>
              <Field label="Họ và tên" required>
                <input className={inputClass} value={form.userName} onChange={set("userName")} placeholder="Nhập họ và tên" required />
              </Field>
              <Field label="Email đăng nhập" required>
                <input type="email" className={inputClass} value={form.email} onChange={set("email")} placeholder="Nhập email" required />
              </Field>
            </fieldset>
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {confirming ? (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>Xác nhận {isEdit ? "lưu thay đổi" : "tạo đại lý"} {form.code ? <b>{String(form.code).toUpperCase()}</b> : null}?</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
                    Quay lại
                  </Button>
                  <Button type="button" onClick={save} disabled={pending}>
                    {pending ? "Đang lưu…" : "Xác nhận"}
                  </Button>
                </div>
              </div>
            ) : (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => reset(false)}>
                  Hủy
                </Button>
                <Button type="submit">Lưu</Button>
              </DialogFooter>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
