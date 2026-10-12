import { requireDealer } from "@/lib/auth-guard";
import { guardResponse, toResponse } from "@/lib/http";
import { submitAttempt } from "@/lib/exam/engine";

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);
  const { attemptId } = await params;
  return toResponse(await submitAttempt(attemptId, guard.dealerId));
}
