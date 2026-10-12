import { z } from "zod";
import { guidSchema } from "@/lib/ids";
import { requireDealer } from "@/lib/auth-guard";
import { apiError, guardResponse, readJson, toResponse } from "@/lib/http";
import { answerPractice } from "@/lib/practice";

const bodySchema = z.object({
  questionId: guidSchema,
  selectedOptionId: guidSchema,
});

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Dữ liệu không hợp lệ");
  const { sessionId } = await params;
  return toResponse(await answerPractice({ sessionId, dealerId: guard.dealerId, ...parsed.data }));
}
