import { z } from "zod";
import { guidSchema } from "@/lib/ids";
import { requireDealer } from "@/lib/auth-guard";
import { apiError, guardResponse, readJson, toResponse } from "@/lib/http";
import { saveAnswer } from "@/lib/exam/engine";

const bodySchema = z.object({
  selectedOptionId: guidSchema.nullable(),
  clientSeq: z.number().int().min(1).max(1_000_000_000),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; attemptQuestionId: string }> }
) {
  const guard = await requireDealer();
  if ("error" in guard) return guardResponse(guard);

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Dữ liệu không hợp lệ");

  const { attemptId, attemptQuestionId } = await params;
  return toResponse(
    await saveAnswer({
      attemptId,
      attemptQuestionId,
      dealerId: guard.dealerId,
      selectedOptionId: parsed.data.selectedOptionId,
      clientSeq: parsed.data.clientSeq,
    })
  );
}
