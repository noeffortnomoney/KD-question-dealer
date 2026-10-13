"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, navFor } from "@/components/layout/nav";
import type { UserRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function SidebarNav({
  role,
  canViewAudit = false,
  onNavigate,
}: {
  role: UserRole;
  canViewAudit?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navFor(role, canViewAudit).map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-foreground/80 hover:bg-brand-soft hover:text-brand"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
