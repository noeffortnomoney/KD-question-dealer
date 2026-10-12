import { notFound, redirect } from "next/navigation";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { requireDealer } from "@/lib/auth-guard";
import { getPracticeSession } from "@/lib/practice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Luyện tập — Kymdan" };

export default async function PracticeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const { sessionId } = await params;
  const result = await getPracticeSession(sessionId, g.dealerId);
  if (!result.ok) notFound();
  return <PracticeRunner initial={result.data} />;
}
