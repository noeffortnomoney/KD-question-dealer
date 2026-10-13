import {
  CalendarDays,
  ClipboardList,
  FileBarChart,
  FileClock,
  Home,
  LibraryBig,
  ListChecks,
  NotebookPen,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AUDIT_LOG_PATH, type UserRole } from "@/lib/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const DEALER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Trang chủ", icon: Home },
  { href: "/training-sessions", label: "Lịch training", icon: CalendarDays },
  { href: "/practice", label: "Luyện tập", icon: NotebookPen },
  { href: "/exams", label: "Kỳ thi", icon: ClipboardList },
  { href: "/my-results", label: "Kết quả của tôi", icon: Trophy },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: Home, exact: true },
  { href: "/admin/dealers", label: "Quản lý đại lý", icon: Users },
  { href: "/admin/training-sessions", label: "Lịch training", icon: CalendarDays },
  { href: "/admin/questions", label: "Ngân hàng câu hỏi", icon: LibraryBig },
  { href: "/admin/exams", label: "Kỳ thi", icon: ListChecks },
  { href: "/admin/reports", label: "Kết quả & báo cáo", icon: FileBarChart },
  { href: AUDIT_LOG_PATH, label: "Audit log", icon: FileClock },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

export function navFor(role: UserRole, canViewAudit = false): NavItem[] {
  if (role !== "admin") return DEALER_NAV;
  return canViewAudit ? ADMIN_NAV : ADMIN_NAV.filter((item) => item.href !== AUDIT_LOG_PATH);
}

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
