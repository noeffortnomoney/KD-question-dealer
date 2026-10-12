import { requireDealer } from "@/lib/auth-guard";
import { guardResponse, toResponse } from "@/lib/http";
import { getPracticeSession } from "@/lib/practice";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);
  const { sessionId } = await params;
  return toResponse(await getPracticeSession(sessionId, guard.dealerId));
}
