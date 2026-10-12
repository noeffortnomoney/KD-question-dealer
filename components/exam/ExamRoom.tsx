"use client";

import { ChevronLeft, ChevronRight, ClipboardList, Flag, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Countdown } from "@/components/exam/Countdown";
import { OptionList } from "@/components/exam/OptionList";
import { QuestionGrid } from "@/components/exam/QuestionGrid";
import { SaveIndicator, type SaveState } from "@/components/exam/SaveIndicator";
import { SubmitDialog } from "@/components/exam/SubmitDialog";
import { Button } from "@/components/ui/button";
import type { ExamQuestionDto } from "@/lib/exam/types";
import { cn } from "@/lib/utils";

interface Props {
  attemptId: string;
  title: string;
  deadlineAtUtc: string;
  serverNowUtc: string;
  questions: ExamQuestionDto[];
}

interface Pending {
  optionId: string | null;
  seq: number;
}

const MAX_RETRY_DELAY = 30_000;
const SUBMIT_FLUSH_TIMEOUT = 10_000;

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ExamRoom({ attemptId, title, deadlineAtUtc, serverNowUtc, questions }: Props) {
  const router = useRouter();
  const ids = useMemo(() => questions.map((q) => q.attemptQuestionId), [questions]);
  const deadlineMs = useMemo(() => new Date(deadlineAtUtc).getTime(), [deadlineAtUtc]);
  const seqKey = `kd:seq:${attemptId}`;
  const flagKey = `kd:flags:${attemptId}`;

  const [answers, setAnswers] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.attemptQuestionId, q.selectedOptionId]))
  );
  const [status, setStatus] = useState<Record<string, SaveState>>({});
  const [current, setCurrent] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [offline, setOffline] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remainingMs, setRemainingMs] = useState(() => deadlineMs - new Date(serverNowUtc).getTime());

  const offsetRef = useRef(new Date(serverNowUtc).getTime() - Date.now());
  const seqRef = useRef(Math.max(0, ...questions.map((q) => q.version)));
  const pendingRef = useRef(new Map<string, Pending>());
  const inflightRef = useRef(new Set<string>());
  const retriesRef = useRef(new Map<string, number>());
  const closedRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    const stored = Number(readSession(seqKey));
    if (Number.isFinite(stored) && stored > seqRef.current) seqRef.current = stored;
    const flags = readSession(flagKey);
    if (flags) {
      try {
        setFlagged(new Set(JSON.parse(flags) as string[]));
      } catch {}
    }
  }, [seqKey, flagKey]);

  const syncClock = useCallback((serverNow?: string) => {
    if (!serverNow) return;
    const t = new Date(serverNow).getTime();
    if (Number.isFinite(t)) offsetRef.current = t - Date.now();
  }, []);

  const setOne = useCallback((id: string, s: SaveState) => setStatus((prev) => ({ ...prev, [id]: s })), []);

  const goToResult = useCallback(() => {
    closedRef.current = true;
    router.replace(`/attempts/${attemptId}/result`);
    router.refresh();
  }, [router, attemptId]);

  const flush = useCallback(
    async (id: string): Promise<void> => {
      if (closedRef.current || inflightRef.current.has(id)) return;
      const item = pendingRef.current.get(id);
      if (!item) return;

      inflightRef.current.add(id);
      setOne(id, "saving");
      let again = false;
      try {
        const res = await fetch(`/api/attempts/${attemptId}/answers/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedOptionId: item.optionId, clientSeq: item.seq }),
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { version: number; selectedOptionId: string | null; serverNowUtc: string };
          syncClock(data.serverNowUtc);
          setOffline(false);
          retriesRef.current.delete(id);
          if (data.version > seqRef.current) {
            seqRef.current = data.version;
            writeSession(seqKey, String(seqRef.current));
          }
          const latest = pendingRef.current.get(id);
          if (latest && latest.seq <= item.seq) {
            pendingRef.current.delete(id);
            setOne(id, "saved");
            setLastSavedAt(new Date());
            if (data.version > item.seq) {
              setAnswers((prev) => ({ ...prev, [id]: data.selectedOptionId }));
            }
          } else {
            again = true;
          }
        } else if (res.status === 409) {
          pendingRef.current.clear();
          toast.info("Bài thi đã kết thúc");
          goToResult();
        } else if (res.status === 401) {
          setOne(id, "error");
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại, bài làm vẫn được giữ.");
        } else if (res.status === 404 || res.status === 422) {
          pendingRef.current.delete(id);
          setOne(id, "error");
          toast.error("Không lưu được câu trả lời này");
        } else {
          throw new Error(String(res.status));
        }
      } catch {
        setOne(id, "error");
        if (typeof navigator !== "undefined" && !navigator.onLine) setOffline(true);
        const n = (retriesRef.current.get(id) ?? 0) + 1;
        retriesRef.current.set(id, n);
        setTimeout(() => void flush(id), Math.min(MAX_RETRY_DELAY, 1000 * 2 ** (n - 1)));
      } finally {
        inflightRef.current.delete(id);
      }
      if (again) await flush(id);
    },
    [attemptId, goToResult, seqKey, setOne, syncClock]
  );

  const flushAll = useCallback(() => {
    for (const id of pendingRef.current.keys()) void flush(id);
  }, [flush]);

  const choose = useCallback(
    (id: string, optionId: string) => {
      if (closedRef.current || submitting) return;
      seqRef.current += 1;
      writeSession(seqKey, String(seqRef.current));
      pendingRef.current.set(id, { optionId, seq: seqRef.current });
      setAnswers((prev) => ({ ...prev, [id]: optionId }));
      void flush(id);
    },
    [flush, seqKey, submitting]
  );

  const submit = useCallback(async () => {
    if (closedRef.current) return;
    setSubmitting(true);
    const started = Date.now();
    while (pendingRef.current.size > 0 && Date.now() - started < SUBMIT_FLUSH_TIMEOUT) {
      flushAll();
      await sleep(300);
    }
    try {
      const res = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST", cache: "no-store" });
      if (res.ok || res.status === 409 || res.status === 404) {
        pendingRef.current.clear();
        goToResult();
        return;
      }
      throw new Error(String(res.status));
    } catch {
      toast.error("Chưa nộp được bài. Kiểm tra kết nối và thử lại.");
      setSubmitting(false);
    }
  }, [attemptId, flushAll, goToResult]);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = deadlineMs - (Date.now() + offsetRef.current);
      setRemainingMs(left);
      if (left <= 0 && !autoSubmittedRef.current && !closedRef.current) {
        autoSubmittedRef.current = true;
        toast.warning("Đã hết giờ làm bài. Hệ thống đang nộp bài của bạn.");
        setDialogOpen(false);
        void submit();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [deadlineMs, submit]);

  useEffect(() => {
    const onOnline = () => {
      setOffline(false);
      flushAll();
    };
    const onOffline = () => setOffline(true);
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current.size > 0 && !closedRef.current) e.preventDefault();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flushAll]);

  const question = questions[current];

  const toggleFlag = useCallback(() => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(question.attemptQuestionId)) next.delete(question.attemptQuestionId);
      else next.add(question.attemptQuestionId);
      writeSession(flagKey, JSON.stringify([...next]));
      return next;
    });
  }, [flagKey, question]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || submitting) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(questions.length - 1, c + 1));
      else if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      else if (/^[1-9]$/.test(e.key)) {
        const opt = question.options[Number(e.key) - 1];
        if (opt) choose(question.attemptQuestionId, opt.optionId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, dialogOpen, question, questions.length, submitting]);

  const answeredCount = ids.filter((id) => answers[id]).length;
  const statuses = Object.values(status);
  const savingCount = statuses.filter((s) => s === "saving").length;
  const failedCount = ids.filter((id) => status[id] === "error" && pendingRef.current.has(id)).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b bg-card/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ClipboardList className="size-5 shrink-0 text-brand" />
            <h1 className="truncate text-base font-semibold sm:text-lg">Kỳ thi: {title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <SaveIndicator saving={savingCount} failed={failedCount} lastSavedAt={lastSavedAt} />
            </div>
            <Countdown remainingMs={remainingMs} />
            <Button onClick={() => setDialogOpen(true)} disabled={submitting} className="h-10 px-5">
              Nộp bài
            </Button>
          </div>
        </div>
        <div className="mt-2 md:hidden">
          <SaveIndicator saving={savingCount} failed={failedCount} lastSavedAt={lastSavedAt} />
        </div>
      </div>

      {offline && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <WifiOff className="size-4" />
          Mất kết nối mạng. Đáp án đang được giữ trên máy và sẽ tự lưu khi có mạng trở lại. Đừng đóng trang.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="order-2 rounded-xl border bg-card p-4 lg:order-1 lg:self-start">
          <QuestionGrid
            ids={ids}
            current={current}
            answered={(id) => Boolean(answers[id])}
            flagged={flagged}
            failed={(id) => status[id] === "error" && pendingRef.current.has(id)}
            onSelect={setCurrent}
          />
          <p className="mt-4 text-sm text-muted-foreground">
            Đã trả lời <b className="text-foreground">{answeredCount}</b>/{questions.length}
          </p>
        </aside>

        <section className="order-1 rounded-xl border bg-card p-5 sm:p-6 lg:order-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-brand">
              Câu {current + 1}/{questions.length}
            </span>
            {status[question.attemptQuestionId] === "error" && pendingRef.current.has(question.attemptQuestionId) && (
              <span className="text-xs text-red-700">Chưa lưu được — đang thử lại</span>
            )}
          </div>
          <p className="mb-5 whitespace-pre-line text-base font-medium leading-relaxed">{question.stem}</p>
          <OptionList
            name={question.attemptQuestionId}
            options={question.options}
            selectedOptionId={answers[question.attemptQuestionId]}
            onSelect={(optionId) => choose(question.attemptQuestionId, optionId)}
            disabled={submitting}
          />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-amber-500"
                checked={flagged.has(question.attemptQuestionId)}
                onChange={toggleFlag}
              />
              <Flag className={cn("size-4", flagged.has(question.attemptQuestionId) ? "text-amber-500" : "text-muted-foreground")} />
              Đánh dấu
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
                <ChevronLeft className="size-4" /> Câu trước
              </Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
                  Câu tiếp theo <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => setDialogOpen(true)} disabled={submitting}>
                  Nộp bài
                </Button>
              )}
            </div>
          </div>
          <p className="mt-4 hidden text-xs text-muted-foreground sm:block">
            Phím tắt: 1–{Math.min(9, question.options.length)} chọn đáp án · ← → chuyển câu
          </p>
        </section>
      </div>

      <SubmitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        answered={answeredCount}
        total={questions.length}
        unsaved={pendingRef.current.size}
        submitting={submitting}
        onConfirm={() => void submit()}
      />
    </div>
  );
}
