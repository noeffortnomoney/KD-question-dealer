import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";
import { toRole } from "@/lib/roles";

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <AppShell role={toRole(session.user.role)}>{children}</AppShell>;
}
