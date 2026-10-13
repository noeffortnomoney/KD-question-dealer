"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { isGuid } from "@/lib/ids";
import { DEFAULT_PASSWORD, hashPassword, passwordProblem } from "@/lib/password";
import { isUniqueViolation, prisma } from "@/lib/prisma";

const dealerSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Mã đại lý là bắt buộc")
    .max(50)
    .regex(/^[A-Z0-9_.-]+$/, "Mã đại lý chỉ gồm chữ, số, dấu - _ ."),
  name: z.string().trim().min(1, "Tên đại lý là bắt buộc").max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+ .()-]*$/, "Số điện thoại không hợp lệ")
    .optional()
    .default(""),
  region: z.string().trim().max(100).optional().default(""),
  userName: z.string().trim().min(1, "Họ tên người dùng là bắt buộc").max(200),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(320),
});

export type DealerInput = z.input<typeof dealerSchema>;

export async function createDealerAction(input: DealerInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  const parsed = dealerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const tempPassword = DEFAULT_PASSWORD;
  const passwordHash = await hashPassword(tempPassword);
  try {
    const dealer = await prisma.$transaction(async (tx) => {
      const created = await tx.dealer.create({
        data: {
          code: d.code,
          name: d.name,
          phone: d.phone || null,
          region: d.region || null,
          users: {
            create: { email: d.email, name: d.userName, role: "dealer", passwordHash, mustChangePassword: true },
          },
        },
      });
      await writeAudit(
        {
          actorUserId: g.userId,
          action: "Dealer.Create",
          entityType: "Dealer",
          entityId: created.id,
          details: { code: d.code, name: d.name, email: d.email, region: d.region },
        },
        tx
      );
      return created;
    });
    revalidatePath("/admin/dealers");
    return { success: true, dealerId: dealer.id, tempPassword, email: d.email };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Mã đại lý hoặc email đã tồn tại" };
    throw error;
  }
}

export async function updateDealerAction(dealerId: string, input: DealerInput) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(dealerId)) return { error: "Không tìm thấy đại lý" };
  const parsed = dealerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const d = parsed.data;

  const before = await prisma.dealer.findUnique({
    where: { id: dealerId },
    select: { code: true, name: true, phone: true, region: true, users: { select: { id: true, email: true, name: true }, take: 1 } },
  });
  if (!before) return { error: "Không tìm thấy đại lý" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.dealer.update({
        where: { id: dealerId },
        data: { code: d.code, name: d.name, phone: d.phone || null, region: d.region || null },
      });
      const user = before.users[0];
      if (user) await tx.user.update({ where: { id: user.id }, data: { email: d.email, name: d.userName } });
      await writeAudit(
        {
          actorUserId: g.userId,
          action: "Dealer.Update",
          entityType: "Dealer",
          entityId: dealerId,
          details: { before, after: d },
        },
        tx
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "Mã đại lý hoặc email đã tồn tại" };
    throw error;
  }
  revalidatePath("/admin/dealers");
  return { success: true };
}

export async function setDealerStatusAction(dealerId: string, status: "active" | "locked") {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(dealerId)) return { error: "Không tìm thấy đại lý" };
  await prisma.$transaction(async (tx) => {
    await tx.dealer.update({ where: { id: dealerId }, data: { status } });
    await tx.user.updateMany({ where: { dealerId }, data: { status } });
    await writeAudit(
      {
        actorUserId: g.userId,
        action: status === "locked" ? "Dealer.Lock" : "Dealer.Unlock",
        entityType: "Dealer",
        entityId: dealerId,
      },
      tx
    );
  });
  revalidatePath("/admin/dealers");
  return { success: true, message: status === "locked" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản" };
}

export async function resetDealerPasswordAction(dealerId: string, newPassword: string = DEFAULT_PASSWORD) {
  const g = await requireAdmin();
  if ("error" in g) return { error: g.error };
  if (!isGuid(dealerId)) return { error: "Không tìm thấy đại lý" };
  const tempPassword = String(newPassword ?? "");
  const problem = passwordProblem(tempPassword);
  if (problem) return { error: problem };
  const user = await prisma.user.findFirst({ where: { dealerId }, select: { id: true, email: true } });
  if (!user) return { error: "Đại lý chưa có tài khoản đăng nhập" };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await writeAudit({ actorUserId: g.userId, action: "User.ResetPassword", entityType: "User", entityId: user.id });
  return { success: true, tempPassword, email: user.email };
}
