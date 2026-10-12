"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useActionState, useState } from "react";
import { inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Email đăng nhập</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email}
            placeholder="Nhập email của bạn"
            className={cn(inputClass, "h-11 pl-9")}
          />
        </div>
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">Mật khẩu</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Nhập mật khẩu"
            className={cn(inputClass, "h-11 pl-9 pr-10")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </label>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full text-base">
        {pending ? "Đang đăng nhập…" : "Đăng nhập"}
      </Button>
    </form>
  );
}
