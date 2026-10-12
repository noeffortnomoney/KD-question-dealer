import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Brand } from "@/components/layout/Brand";
import { auth } from "@/lib/auth";
import { homePathFor, toRole } from "@/lib/roles";

export const metadata = { title: "Đổi mật khẩu — Kymdan" };

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const forced = session.user.mustChangePassword;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-sm">
        <Brand className="mb-8" subtitle="Đào tạo đại lý" />
        <h1 className="text-xl font-bold">Đổi mật khẩu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {forced
            ? "Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được cấp lại. Vui lòng đặt mật khẩu mới để tiếp tục."
            : "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số."}
        </p>
        <ChangePasswordForm homePath={homePathFor(toRole(session.user.role))} forced={forced} />
      </div>
    </div>
  );
}
