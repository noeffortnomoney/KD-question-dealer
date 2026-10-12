import Link from "next/link";
import { Brand } from "@/components/layout/Brand";
import { auth } from "@/lib/auth";

export default async function ExamLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-8">
        <Link href="/dashboard" aria-label="Về trang chủ">
          <Brand />
        </Link>
        <span className="text-sm text-muted-foreground">{session?.user?.name}</span>
      </header>
      <main className="px-4 py-4 lg:px-8">{children}</main>
    </div>
  );
}
