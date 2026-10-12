"use client";

import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Field, inputClass, textareaClass } from "@/components/common/Field";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAttemptDetailAction, reissueAttemptAction, type AttemptDetail } from "@/lib/actions/admin/attempts";
import { formatDateTime, formatDuration } from "@/lib/date-utils";
import { formatScore } from "@/lib/format";
import { ATTEMPT_STATUS_LABEL, REISSUE_CATEGORIES } from "@/lib/labels";
import { cn } from "@/lib/utils";

const same = (a: string | null, b: string | null) => Boolean(a && b && a.toLowerCase() === b.toLowerCase());

export function AttemptDrawer({ attemptId, onClose }: { attemptId: string | null; onClose: () => void }) {
  const [data, setData] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reissueOpen, setReissueOpen] = useState(false);

  const load = (id: string) => {
    setLoading(true);
    getAttemptDetailAction(id).then((res) => {
      if (res.error) toast.error(res.error);
      setData(res.data ?? null);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (attemptId) load(attemptId);
    else setData(null);
  }, [attemptId]);

  const duration =
    data?.finishedAt ? (new Date(data.finishedAt).getTime() - new Date(data.startedAt).getTime()) / 1000 : null;

  return (
    <Sheet open={Boolean(attemptId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Chi tiết lượt thi</SheetTitle>
          <SheetDescription>{data ? `${data.dealer.code} — ${data.dealer.name}` : "Đang tải…"}</SheetDescription>
        </SheetHeader>
        {loading && <p className="px-4 text-sm text-muted-foreground">Đang tải…</p>}
        {data && !loading && (
          <div className="space-y-5 px-4 pb-8">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Kỳ thi</p>
                <p className="font-medium">{data.exam.title}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Người làm bài</p>
                <p className="font-medium">{data.user.name}</p>
                <p className="text-xs text-muted-foreground">{data.user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trạng thái</p>
                <StatusBadge map={ATTEMPT_STATUS_LABEL} value={data.status} /> <span className="text-xs">Lượt {data.attemptNo}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Điểm</p>
                <p className="font-semibold">
                  {data.scorePercent !== null ? `${formatScore(data.scorePercent)}/100 · ${data.correctCount}/${data.totalQuestions} câu` : "—"}{" "}
                  {data.isPassed !== null && (
                    <span className={data.isPassed ? "text-success" : "text-red-600"}>{data.isPassed ? "Đạt" : "Không đạt"}</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Bắt đầu / Hạn chót</p>
                <p>
                  {formatDateTime(data.startedAt)} / {formatDateTime(data.deadlineAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Kết thúc · Thời gian làm</p>
                <p>
                  {formatDateTime(data.finishedAt)} {duration !== null && `· ${formatDuration(duration)}`}
                </p>
              </div>
            </div>

            {data.status === "Voided" && (
              <div className="rounded-lg bg-red-50 p-3 text-sm">
                <p className="font-semibold text-red-700">Đã hủy lúc {formatDateTime(data.voidedAt)}</p>
                <p>
                  {REISSUE_CATEGORIES[data.voidReasonCategory ?? ""] ?? data.voidReasonCategory}: {data.voidReason}
                </p>
              </div>
            )}

            {data.history.length > 1 && (
              <div className="text-sm">
                <p className="mb-1 font-semibold">Các lượt của đại lý trong kỳ thi này</p>
                <ul className="space-y-1">
                  {data.history.map((h) => (
                    <li key={h.id} className={cn(same(h.id, data.id) && "font-semibold")}>
                      Lượt {h.attemptNo}: {ATTEMPT_STATUS_LABEL[h.status]?.text ?? h.status}
                      {h.scorePercent !== null && ` · ${formatScore(h.scorePercent)}/100`}
                      {h.voidReason && <span className="text-muted-foreground"> — {h.voidReason}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.status !== "Voided" && (
              <Button variant="outline" onClick={() => setReissueOpen(true)}>
                <RotateCcw className="size-4" /> Cấp lại lượt thi
              </Button>
            )}

            <div>
              <p className="mb-2 font-semibold">
                Bài làm ({data.answeredCount}/{data.totalQuestions} câu đã trả lời)
              </p>
              <div className="space-y-3">
                {data.items.map((it) => {
                  const correct = same(it.selectedOptionId, it.correctOptionId);
                  return (
                    <div key={it.order} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">
                        <span className="mr-1 text-brand">Câu {it.order}.</span>
                        {it.stem}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {it.options.map((o) => (
                          <li
                            key={o.id}
                            className={cn(
                              "flex items-center gap-2 rounded px-2 py-1",
                              same(o.id, it.correctOptionId) && "bg-success-soft",
                              same(o.id, it.selectedOptionId) && !correct && "bg-red-50"
                            )}
                          >
                            {same(o.id, it.correctOptionId) ? (
                              <CheckCircle2 className="size-4 text-success" />
                            ) : same(o.id, it.selectedOptionId) ? (
                              <XCircle className="size-4 text-red-600" />
                            ) : (
                              <span className="size-4" />
                            )}
                            {o.text}
                            {same(o.id, it.selectedOptionId) && <span className="ml-auto text-xs text-muted-foreground">Đã chọn</span>}
                          </li>
                        ))}
                      </ul>
                      {!it.selectedOptionId && <p className="mt-1 text-xs text-amber-700">Không trả lời</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {data && (
          <ReissueDialog
            open={reissueOpen}
            onOpenChange={setReissueOpen}
            attempt={data}
            onDone={() => {
              setReissueOpen(false);
              load(data.id);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ReissueDialog({
  open,
  onOpenChange,
  attempt,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  attempt: AttemptDetail;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<"SystemIncident" | "DealerDeviceOrNetwork" | "Other">("DealerDeviceOrNetwork");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await reissueAttemptAction(attempt.id, { reason, reasonCategory: category });
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(res.message ?? "Đã cấp lại lượt");
      setReason("");
      router.refresh();
      onDone();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cấp lại lượt thi</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Đại lý <b className="text-foreground">{attempt.dealer.code} — {attempt.dealer.name}</b>, kỳ thi <b className="text-foreground">{attempt.exam.title}</b>.
              </p>
              <p>
                Lượt hiện tại (lượt {attempt.attemptNo}, {ATTEMPT_STATUS_LABEL[attempt.status]?.text}
                {attempt.scorePercent !== null && `, ${formatScore(attempt.scorePercent)}/100`}) sẽ bị <b>hủy</b>. Đại lý được làm lại từ đầu với đề mới.
                Thao tác được ghi audit log.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <Field label="Phân loại lý do" required>
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            {Object.entries(REISSUE_CATEGORIES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lý do chi tiết" required hint="Tối thiểu 10 ký tự">
          <textarea className={textareaClass} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending || reason.trim().length < 10}>
            {pending ? "Đang xử lý…" : "Xác nhận cấp lại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
