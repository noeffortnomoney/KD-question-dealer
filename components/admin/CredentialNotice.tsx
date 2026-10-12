"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CredentialNotice({ email, password }: { email: string; password: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nMật khẩu tạm: ${password}`);
      toast.success("Đã sao chép");
    } catch {
      toast.error("Không sao chép được, vui lòng chép tay");
    }
  };
  return (
    <div className="rounded-xl border border-amber-200 bg-warning-soft p-4 text-sm">
      <p className="font-semibold text-amber-800">Thông tin đăng nhập — chỉ hiển thị một lần</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="font-medium">{email}</dd>
        <dt className="text-muted-foreground">Mật khẩu tạm</dt>
        <dd className="font-mono font-semibold" data-testid="temp-password">
          {password}
        </dd>
      </dl>
      <p className="mt-2 text-xs text-amber-800">Đại lý sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
      <Button size="sm" variant="outline" className="mt-3" onClick={copy}>
        <Copy className="size-3.5" /> Sao chép
      </Button>
    </div>
  );
}
