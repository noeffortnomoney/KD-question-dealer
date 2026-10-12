export type UserRole = "admin" | "dealer";

export const SHARED_PATHS = ["/change-password", "/notifications"] as const;

export function toRole(value: unknown): UserRole {
  return value === "admin" ? "admin" : "dealer";
}

export function homePathFor(role: UserRole): string {
  return role === "admin" ? "/admin" : "/dashboard";
}

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (SHARED_PATHS.some((p) => matches(pathname, p))) return true;
  const isAdminPath = matches(pathname, "/admin");
  return role === "admin" ? isAdminPath : !isAdminPath;
}
