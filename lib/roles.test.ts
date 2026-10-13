import { describe, expect, it } from "vitest";
import { canAccessPath, canViewAuditLog } from "@/lib/roles";

describe("canViewAuditLog", () => {
  it("chỉ admin@kymdan.local", () => {
    expect(canViewAuditLog("admin", "admin@kymdan.local")).toBe(true);
    expect(canViewAuditLog("admin", " Admin@Kymdan.local ")).toBe(true);
    expect(canViewAuditLog("admin", "khac@kymdan.local")).toBe(false);
    expect(canViewAuditLog("admin", null)).toBe(false);
    expect(canViewAuditLog("dealer", "admin@kymdan.local")).toBe(false);
  });
});

describe("canAccessPath", () => {
  it("trang audit log chặn quản trị viên khác, các trang admin khác vẫn vào được", () => {
    expect(canAccessPath("admin", "/admin/audit-logs", "admin@kymdan.local")).toBe(true);
    expect(canAccessPath("admin", "/admin/audit-logs", "khac@kymdan.local")).toBe(false);
    expect(canAccessPath("admin", "/admin/audit-logs/x", "khac@kymdan.local")).toBe(false);
    expect(canAccessPath("admin", "/admin/dealers", "khac@kymdan.local")).toBe(true);
    expect(canAccessPath("dealer", "/admin/audit-logs", "admin@kymdan.local")).toBe(false);
  });
});
