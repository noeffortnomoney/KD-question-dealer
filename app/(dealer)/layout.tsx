import { AppShell } from "@/components/layout/AppShell";

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="dealer">{children}</AppShell>;
}
