import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewAuditLog, toRole, type UserRole } from "@/lib/roles";

export interface AuthedUser {
  userId: string;
  role: UserRole;
  name: string;
}

export interface AuthedDealer extends AuthedUser {
  dealerId: string;
}

export interface GuardError {
  error: string;
  status: 401 | 403;
}

export async function requireUser(): Promise<AuthedUser | GuardError> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Bạn cần đăng nhập", status: 401 };
  return {
    userId: session.user.id,
    role: toRole(session.user.role),
    name: session.user.name ?? "",
  };
}

export async function requireAdmin(): Promise<AuthedUser | GuardError> {
  const guard = await requireUser();
  if ("error" in guard) return { error: guard.error, status: guard.status };
  if (guard.role !== "admin") return { error: "Không có quyền truy cập", status: 403 };
  return guard;
}

export async function requireAuditLogViewer(): Promise<AuthedUser | GuardError> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error, status: guard.status };
  const user = await prisma.user.findUnique({ where: { id: guard.userId }, select: { email: true, status: true } });
  if (!user || user.status !== "active" || !canViewAuditLog(guard.role, user.email)) {
    return { error: "Không có quyền truy cập", status: 403 };
  }
  return guard;
}

export async function requireDealer(): Promise<AuthedDealer | GuardError> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Bạn cần đăng nhập", status: 401 };
  if (toRole(session.user.role) !== "dealer" || !session.user.dealerId) {
    return { error: "Không có quyền truy cập", status: 403 };
  }
  return {
    userId: session.user.id,
    role: "dealer",
    name: session.user.name ?? "",
    dealerId: session.user.dealerId,
  };
}

export async function requireActiveDealer(): Promise<AuthedDealer | GuardError> {
  const guard = await requireDealer();
  if ("error" in guard) return { error: guard.error, status: guard.status };
  const user = await prisma.user.findUnique({
    where: { id: guard.userId },
    select: { status: true, dealer: { select: { status: true } } },
  });
  if (!user || user.status !== "active" || user.dealer?.status !== "active") {
    return { error: "Tài khoản đã bị khóa", status: 403 };
  }
  return guard;
}
