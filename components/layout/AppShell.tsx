import { Brand } from "@/components/layout/Brand";
import { MobileNav } from "@/components/layout/MobileNav";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { UserMenu } from "@/components/layout/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/roles";

export async function AppShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const session = await auth();
  const name = session?.user?.name ?? "";
  let subtitle = "Quản trị viên";
  if (role === "dealer" && session?.user?.dealerId) {
    const dealer = await prisma.dealer.findUnique({
      where: { id: session.user.dealerId },
      select: { name: true },
    });
    subtitle = dealer?.name ?? "Đại lý";
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card px-4 py-6 lg:flex">
        <Brand className="px-3 pb-8" subtitle={role === "admin" ? "Quản trị" : "Đào tạo đại lý"} />
        <SidebarNav role={role} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <MobileNav role={role} />
            <Brand className="lg:hidden" />
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <UserMenu name={name} subtitle={subtitle} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
