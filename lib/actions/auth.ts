"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homePathFor, toRole } from "@/lib/roles";
import { signIn, signOut } from "@/lib/auth";
import { requireUser } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export interface LoginState {
  error?: string;
  email?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu", email };
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email hoặc mật khẩu không đúng, hoặc tài khoản đang bị khóa tạm thời", email };
    }
    throw error;
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true, mustChangePassword: true } });
  redirect(user?.mustChangePassword ? "/change-password" : homePathFor(toRole(user?.role)));
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, "Nhập mật khẩu hiện tại"),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Mật khẩu nhập lại không khớp" })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Mật khẩu mới phải khác mật khẩu hiện tại" });

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const g = await requireUser();
  if ("error" in g) return { error: g.error };

  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const problem = passwordProblem(parsed.data.newPassword);
  if (problem) return { error: problem };

  const user = await prisma.user.findUnique({ where: { id: g.userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { error: "Mật khẩu hiện tại không đúng" };
  }

  await prisma.user.update({
    where: { id: g.userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
  });
  await writeAudit({ actorUserId: g.userId, action: "User.ChangePassword", entityType: "User", entityId: g.userId });
  return { success: true };
}
