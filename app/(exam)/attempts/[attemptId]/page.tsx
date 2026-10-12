import { notFound, redirect } from "next/navigation";
import { ExamRoom } from "@/components/exam/ExamRoom";
import { requireDealer } from "@/lib/auth-guard";
import { getAttemptForDealer } from "@/lib/exam/engine";

export const dynamic = "force-dynamic";
export const metadata = { title: "Làm bài thi — Kymdan" };

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) redirect("/login");
  const { attemptId } = await params;

  const result = await getAttemptForDealer(attemptId, guard.dealerId);
  if (!result.ok) notFound();
  const view = result.data;
  if (view.status !== "InProgress" || !view.questions) redirect(`/attempts/${view.attemptId}/result`);

  return (
    <ExamRoom
      attemptId={view.attemptId}
      title={view.title}
      deadlineAtUtc={view.deadlineAtUtc}
      serverNowUtc={view.serverNowUtc}
      questions={view.questions}
    />
  );
}
