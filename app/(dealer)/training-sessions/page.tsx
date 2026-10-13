import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { SessionRow } from "@/components/learning/SessionRow";
import { requireDealer } from "@/lib/auth-guard";
import { getDealerSessions, MEET_JOIN_EARLY_MINUTES } from "@/lib/queries/learning";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lịch training — Kymdan" };

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "upcoming", label: "Sắp diễn ra" },
  { key: "past", label: "Đã diễn ra" },
] as const;

export default async function TrainingSessionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const { tab } = await searchParams;
  const scope = tab === "all" || tab === "past" ? tab : "upcoming";
  const sessions = await getDealerSessions(g.dealerId, scope);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Lịch training"
        description={`Buổi training qua Google Meet. Nút "Tham gia" mở trước giờ bắt đầu ${MEET_JOIN_EARLY_MINUTES} phút.`}
      />
      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/training-sessions?tab=${t.key}`}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium",
              scope === t.key ? "bg-brand text-white" : "bg-card text-foreground/80 hover:bg-brand-soft"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {sessions.length === 0 ? (
        <EmptyState title="Không có buổi training" />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} showDetails />
          ))}
        </div>
      )}
    </div>
  );
}
