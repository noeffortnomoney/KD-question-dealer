import { BookOpen, CalendarDays, ChevronRight, FileText, Trophy } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { ToneBadge } from "@/components/common/StatusBadge";
import { EXAM_STATE_LABEL, ExamActionButton } from "@/components/exam/ExamActionButton";
import { SessionRow } from "@/components/learning/SessionRow";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { listDealerExams } from "@/lib/exam/engine";
import { formatScore } from "@/lib/format";
import { getDealerCourses, getDealerSessions } from "@/lib/queries/learning";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trang chủ — Kymdan" };

export default async function DealerDashboard() {
  const g = await requireDealer();
  if ("error" in g) redirect("/login");

  const [courses, sessions, exams] = await Promise.all([
    getDealerCourses(g.dealerId),
    getDealerSessions(g.dealerId, "upcoming"),
    listDealerExams(g.dealerId),
  ]);
  const activeCourses = courses.filter((c) => !c.completed);
  const openExams = exams.filter((e) => ["can_start", "in_progress", "reissued", "not_open"].includes(e.state));
  const latest = exams.find((e) => e.state === "finished" && e.score.visible);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="brand-gradient relative overflow-hidden rounded-2xl px-6 py-8 text-white sm:px-10 sm:py-10">
        <p className="text-sm text-white/80">Xin chào, {g.name}</p>
        <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">
          Kiến thức vững vàng
          <br />
          Đồng hành phát triển
        </h1>
        <p className="mt-3 max-w-lg text-sm text-white/85">Cùng Kymdan nâng cao kiến thức, phục vụ khách hàng tốt hơn.</p>
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-24 right-32 size-56 rounded-full bg-white/5" />
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Khóa đào tạo" value={activeCourses.length} hint="Đang học" icon={BookOpen} tone="info" />
        <StatCard label="Lịch training" value={sessions.length} hint="Sắp diễn ra" icon={CalendarDays} tone="success" />
        <StatCard
          label="Kỳ thi"
          value={exams.filter((e) => e.state === "can_start" || e.state === "in_progress" || e.state === "reissued").length}
          hint="Chưa hoàn thành"
          icon={FileText}
          tone="brand"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Lịch training sắp tới</h2>
            <Link href="/training-sessions" className="flex items-center text-sm text-brand hover:underline">
              Xem tất cả <ChevronRight className="size-4" />
            </Link>
          </div>
          {sessions.length === 0 ? (
            <EmptyState title="Chưa có lịch training" description="Lịch các buổi Google Meet sẽ hiển thị ở đây." />
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 3).map((s) => (
                <SessionRow key={s.id} session={s} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Kỳ thi của bạn</h2>
              <Link href="/exams" className="flex items-center text-sm text-brand hover:underline">
                Xem tất cả <ChevronRight className="size-4" />
              </Link>
            </div>
            {openExams.length === 0 ? (
              <EmptyState title="Không có kỳ thi đang mở" className="py-8" />
            ) : (
              <div className="space-y-3">
                {openExams.slice(0, 3).map((e) => (
                  <div key={e.examId} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.questionCount} câu hỏi · {e.durationMinutes} phút
                      </p>
                      <ToneBadge tone={EXAM_STATE_LABEL[e.state].tone} className="mt-1">
                        {EXAM_STATE_LABEL[e.state].text}
                      </ToneBadge>
                    </div>
                    <ExamActionButton exam={e} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-bold">Kết quả gần nhất</h2>
            {latest ? (
              <Link
                href={`/attempts/${latest.attemptId}/result`}
                className="card-lift flex items-center gap-4 rounded-xl border bg-card p-4"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success">
                  <Trophy className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{latest.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatScore(latest.score.scorePercent)}/100 ·{" "}
                    <span className={latest.score.isPassed ? "text-success" : "text-red-600"}>
                      {latest.score.isPassed ? "Đạt" : "Không đạt"}
                    </span>
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ) : (
              <EmptyState title="Chưa có kết quả" className="py-8" />
            )}
          </div>
        </section>
      </div>

      {activeCourses.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Khóa học đang học</h2>
            <Link href="/courses" className="flex items-center text-sm text-brand hover:underline">
              Xem tất cả <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeCourses.slice(0, 3).map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} className="card-lift rounded-xl border bg-card p-4">
                <p className="font-semibold">{c.title}</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-success" style={{ width: `${c.percent}%` }} />
                  </div>
                  <span className="text-xs font-semibold">{c.percent}%</span>
                </div>
                {c.nextSessionAt && (
                  <p className="mt-2 text-xs text-muted-foreground">Buổi tiếp theo: {formatDateTime(c.nextSessionAt)}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
