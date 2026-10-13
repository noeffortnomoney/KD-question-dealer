import { Clock, Lock, Medal, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { requireDealer } from "@/lib/auth-guard";
import { formatDateTime, formatDuration } from "@/lib/date-utils";
import { formatScore } from "@/lib/format";
import { PUBLIC_TOP, getDealerRanking } from "@/lib/ranking";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Xếp hạng — Kymdan" };

const MEDAL = ["text-amber-500", "text-slate-400", "text-orange-700"];

export default async function DealerRankingPage({ params }: { params: Promise<{ examId: string }> }) {
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const { examId } = await params;
  const data = await getDealerRanking(examId, g.dealerId);

  if (!data.ok) {
    if (data.reason === "not_found") notFound();
    const message = {
      not_ended: `Bảng xếp hạng sẽ có sau khi kỳ thi kết thúc${data.exam?.endsAt ? ` (${formatDateTime(data.exam.endsAt)})` : ""}.`,
      score_hidden: "Kỳ thi này không công bố điểm nên không có xếp hạng.",
      not_participated: "Bạn không có bài thi được chấm trong kỳ thi này nên không có xếp hạng.",
    }[data.reason];
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/exams" className="text-sm text-muted-foreground hover:text-brand">
          ← Kỳ thi
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Xếp hạng: {data.exam?.title}</h1>
        <EmptyState title="Chưa có xếp hạng" description={message} className="mt-6" />
      </div>
    );
  }

  const { exam, me, total, region, top } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/exams" className="text-sm text-muted-foreground hover:text-brand">
          ← Kỳ thi
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Xếp hạng: {exam.title}</h1>
        <p className="text-sm text-muted-foreground">Kết quả chính thức sau khi kỳ thi kết thúc.</p>
      </div>

      <section className="brand-gradient relative overflow-hidden rounded-2xl p-6 text-white sm:p-8" data-testid="my-rank">
        <p className="text-sm text-white/80">Hạng của bạn</p>
        <p className="mt-1 text-5xl font-bold tracking-tight">
          {me.rank}
          <span className="text-2xl font-semibold text-white/80">/{total}</span>
        </p>
        <p className="mt-2 text-sm text-white/90">
          Nằm trong top {data.topPercent}% đại lý tham gia
          {region && (
            <>
              {" "}· Hạng {region.rank}/{region.total} tại {region.name}
            </>
          )}
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-white/70">Điểm của bạn</p>
            <p className="text-xl font-bold">{formatScore(me.scorePercent)}/100</p>
          </div>
          <div>
            <p className="text-white/70">Thời gian làm</p>
            <p className="text-xl font-bold">{Math.round(me.durationSeconds / 60)} phút</p>
          </div>
          <div>
            <p className="text-white/70">Điểm trung bình chung</p>
            <p className="text-xl font-bold">{formatScore(data.avgScore)}</p>
          </div>
        </div>
        <Trophy className="pointer-events-none absolute -right-4 -top-4 size-40 text-white/10" />
      </section>

      {top ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Medal className="size-5 text-amber-500" /> Top {PUBLIC_TOP}
          </h2>
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <SttHead />
                  <TableHead className="w-20">Hạng</TableHead>
                  <TableHead>Đại lý</TableHead>
                  <TableHead>Khu vực</TableHead>
                  <TableHead className="text-right">Điểm</TableHead>
                  <TableHead>Thời gian làm</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((r, i) => (
                  <TableRow key={i} className={cn(r.isMe && "bg-brand-soft/60 font-semibold")} data-testid="top-row">
                    <SttCell n={i + 1} />
                    <TableCell>
                      <span className="flex items-center gap-1.5 font-bold tabular-nums">
                        {r.rank <= 3 && <Medal className={cn("size-4", MEDAL[r.rank - 1])} />}
                        {r.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.name} {r.isMe && <span className="text-xs text-brand">(bạn)</span>}
                    </TableCell>
                    <TableCell>{r.region ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatScore(r.scorePercent)}</TableCell>
                    <TableCell className="text-xs">{formatDuration(r.durationSeconds)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {me.rank > PUBLIC_TOP && (
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn đứng hạng {me.rank} — chưa nằm trong top {PUBLIC_TOP}.
            </p>
          )}
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground" data-testid="leaderboard-private">
          <Lock className="size-4 shrink-0" />
          Bảng xếp hạng đầy đủ không được công khai cho kỳ thi này. Bạn chỉ xem được thứ hạng của mình.
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" /> {total} đại lý có bài được chấm
        </span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" /> Bằng điểm thì ai làm nhanh hơn xếp trên
        </span>
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href={`/attempts/${me.attemptId}/result`}>Xem bài làm của tôi</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/exams">Về danh sách kỳ thi</Link>
        </Button>
      </div>
    </div>
  );
}
