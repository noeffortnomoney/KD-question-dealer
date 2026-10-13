"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Brand } from "@/components/layout/Brand";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { UserRole } from "@/lib/roles";

export function MobileNav({ role, canViewAudit = false }: { role: UserRole; canViewAudit?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-4">
        <SheetHeader className="p-0 pb-4">
          <SheetTitle asChild>
            <div>
              <Brand subtitle={role === "admin" ? "Quản trị" : "Đào tạo đại lý"} />
            </div>
          </SheetTitle>
        </SheetHeader>
        <SidebarNav role={role} canViewAudit={canViewAudit} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
