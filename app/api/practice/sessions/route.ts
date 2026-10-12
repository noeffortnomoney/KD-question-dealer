import { z } from "zod";
import { guidSchema } from "@/lib/ids";
import { requireActiveDealer } from "@/lib/auth-guard";
import { apiError, guardResponse, readJson, toResponse } from "@/lib/http";
import { createPracticeSession } from "@/lib/practice";

const bodySchema = z.object({
  categoryId: guidSchema.nullable(),
  size: z.number().int().min(1).max(50),
});

export async function POST(request: Request) {
  const guard = await requireActiveDealer();
  if ("error" in guard) return guardResponse(guard);
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(422, "VALIDATION_FAILED", "Dữ liệu không hợp lệ");
  return toResponse(
    await createPracticeSession(
      { userId: guard.userId, dealerId: guard.dealerId },
      parsed.data.categoryId,
      parsed.data.size
    )
  );
}
