import { requireActiveDealer } from "@/lib/auth-guard";
import { guardResponse, toResponse } from "@/lib/http";
import { startAttempt } from "@/lib/exam/engine";

export async function POST(_request: Request, { params }: { params: Promise<{ examId: string }> }) {
  const guard = await requireActiveDealer();
  if ("error" in guard) return guardResponse(guard);
  const { examId } = await params;
  return toResponse(await startAttempt(examId, { userId: guard.userId, dealerId: guard.dealerId }));
}
