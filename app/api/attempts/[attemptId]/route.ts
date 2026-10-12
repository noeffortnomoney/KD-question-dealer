import { requireDealer } from "@/lib/auth-guard";
import { guardResponse, toResponse } from "@/lib/http";
import { getAttemptForDealer } from "@/lib/exam/engine";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);
  const { attemptId } = await params;
  return toResponse(await getAttemptForDealer(attemptId, guard.dealerId));
}
