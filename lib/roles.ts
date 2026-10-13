export type UserRole = "admin" | "dealer";

export const SHARED_PATHS = ["/change-password", "/notifications"] as const;

export const AUDIT_LOG_PATH = "/admin/audit-logs";
export const AUDIT_LOG_OWNER_EMAIL = "admin@kymdan.local";

export function canViewAuditLog(role: UserRole, email: string | null | undefined): boolean {
  return role === "admin" && (email ?? "").trim().toLowerCase() === AUDIT_LOG_OWNER_EMAIL;
}

export function toRole(value: unknown): UserRole {
  return value === "admin" ? "admin" : "dealer";
}

export function homePathFor(role: UserRole): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessPath(role: UserRole, pathname: string, email?: string | null): boolean {
  if (SHARED_PATHS.some((p) => matches(pathname, p))) return true;
  if (matches(pathname, AUDIT_LOG_PATH)) return canViewAuditLog(role, email);
  const isAdminPath = matches(pathname, "/admin");
  return role === "admin" ? isAdminPath : !isAdminPath;
}
