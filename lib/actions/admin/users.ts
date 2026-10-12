"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { isGuid, sameId } from "@/lib/ids";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { isUniqueViolation, prisma } from "@/lib/prisma";

const adminSchema = z.object({
  name: z.string().trim().min(1, "Họ tên là bắt buộc").max(200),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(320),
});

export async function createAdminAction(input: { name: string; email: string }) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = adminSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const tempPassword = generateTempPassword();
  try {
    const user = await prisma.user.create({
      data: { ...parsed.data, role: "admin", passwordHash: await hashPassword(tempPassword), mustChangePassword: true },
    });
    await writeAudit({ actorUserId: g.userId, action: "User.CreateAdmin", entityType: "User", entityId: user.id, details: parsed.data });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Email đã tồn tại" };
    throw error;
  }
  revalidatePath("/admin/settings");
  return { success: true, tempPassword, email: parsed.data.email };
}

export async function setAdminStatusAction(userId: string, status: "active" | "locked") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(userId)) return { error: "Không tìm thấy tài khoản" };
  if (sameId(userId, g.userId)) return { error: "Không thể tự khóa tài khoản của mình" };
  if (status === "locked") {
    const activeAdmins = await prisma.user.count({ where: { role: "admin", status: "active" } });
    if (activeAdmins <= 1) return { error: "Phải còn ít nhất một quản trị viên hoạt động" };
  }
  await prisma.user.updateMany({ where: { id: userId, role: "admin" }, data: { status } });
  await writeAudit({ actorUserId: g.userId, action: status === "locked" ? "User.Lock" : "User.Unlock", entityType: "User", entityId: userId });
  revalidatePath("/admin/settings");
  return { success: true, message: status === "locked" ? "Đã khóa" : "Đã mở khóa" };
}

export async function resetAdminPasswordAction(userId: string) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(userId)) return { error: "Không tìm thấy tài khoản" };
  const user = await prisma.user.findFirst({ where: { id: userId, role: "admin" }, select: { email: true } });
  if (!user) return { error: "Không tìm thấy tài khoản" };
  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(tempPassword), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
  });
  await writeAudit({ actorUserId: g.userId, action: "User.ResetPassword", entityType: "User", entityId: userId });
  return { success: true, tempPassword, email: user.email };
}
