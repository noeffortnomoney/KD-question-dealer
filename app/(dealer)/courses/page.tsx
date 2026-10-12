import { CalendarDays, FileText, GraduationCap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { getDealerCourses } from "@/lib/queries/learning";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Khóa đào tạo — Kymdan" };

const TABS = [
  { key: "", label: "Tất cả" },
  { key: "learning", label: "Đang học" },
  { key: "completed", label: "Đã hoàn thành" },
];

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const { tab = "", q = "" } = await searchParams;

  const all = await getDealerCourses(g.dealerId);
  const query = q.trim().toLowerCase();
  const courses = all.filter((c) => {
    if (tab === "learning" && c.completed) return false;
    if (tab === "completed" && !c.completed) return false;
    if (query && !c.title.toLowerCase().includes(query)) return false;
    return true;
  });
  const count = (key: string) =>
    key === "learning" ? all.filter((c) => !c.completed).length : key === "completed" ? all.filter((c) => c.completed).length : all.length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Khóa đào tạo" description="Các khóa học bạn được giao" />
      <form method="get" className="mb-4">
        <input type="hidden" name="tab" value={tab} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm kiếm khóa đào tạo…"
          className="h-10 w-full rounded-lg border bg-card px-4 text-sm outline-none focus:border-brand"
        />
      </form>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key ? `/courses?tab=${t.key}` : "/courses"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              tab === t.key ? "bg-brand text-white" : "bg-card text-foreground/80 hover:bg-brand-soft"
            )}
          >
            {t.label} ({count(t.key)})
          </Link>
        ))}
      </div>

      {courses.length === 0 ? (
        <EmptyState title="Không có khóa học" description="Khi được giao khóa đào tạo, khóa học sẽ xuất hiện ở đây." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="card-lift flex flex-col overflow-hidden rounded-xl border bg-card">
              <div className="brand-gradient relative flex h-28 items-end p-4">
                <GraduationCap className="absolute right-4 top-4 size-10 text-white/30" />
                <ToneBadge tone={c.completed ? "success" : "brand"} className="bg-white/90">
                  {c.completed ? "Đã hoàn thành" : "Đang học"}
                </ToneBadge>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-semibold">{c.title}</h2>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" /> {c.materialCount} tài liệu
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" /> {c.sessionCount} buổi training
                  </span>
                </div>
                {c.nextSessionAt && <p className="mt-1 text-xs text-muted-foreground">Buổi tiếp theo: {formatDateTime(c.nextSessionAt)}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-success" style={{ width: `${c.percent}%` }} />
                  </div>
                  <span className="text-xs font-semibold">{c.percent}%</span>
                </div>
                <Button asChild className="mt-4" variant={c.completed ? "outline" : "default"}>
                  <Link href={`/courses/${c.id}`}>{c.completed ? "Xem lại" : c.percent > 0 ? "Tiếp tục" : "Học ngay"}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
