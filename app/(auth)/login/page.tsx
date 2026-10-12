import { Award, Moon, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Brand } from "@/components/layout/Brand";

export const metadata = { title: "Đăng nhập — Kymdan" };

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="brand-gradient relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <span className="font-brand text-5xl font-bold">Kymdan</span>
          <h1 className="mt-10 text-2xl font-semibold uppercase leading-snug tracking-wide">
            Dealer Training &<br />
            Examination Portal
          </h1>
          <ul className="mt-8 space-y-2 text-lg text-white/90">
            <li>Đồng hành cùng đại lý</li>
            <li>Kiến thức vững vàng</li>
            <li>Phát triển bền vững</li>
          </ul>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm text-white/90">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5" /> Chất lượng vượt trội
          </div>
          <div className="flex items-center gap-2">
            <Moon className="size-5" /> Giấc ngủ trọn vẹn
          </div>
          <div className="flex items-center gap-2">
            <Award className="size-5" /> Vì cuộc sống tốt đẹp hơn
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-24 size-80 rounded-full bg-white/5" />
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Brand className="mb-10 lg:hidden" subtitle="Đào tạo đại lý" />
          <h2 className="text-2xl font-bold">Đăng nhập</h2>
          <p className="mt-1 text-sm text-muted-foreground">Truy cập hệ thống đào tạo và kiểm tra đại lý</p>
          <LoginForm />
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Quên mật khẩu? Liên hệ quản trị viên Kymdan để được cấp lại.
          </p>
        </div>
      </section>
    </div>
  );
}
