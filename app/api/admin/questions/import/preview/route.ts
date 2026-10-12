import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { apiError, guardResponse } from "@/lib/http";
import { analyzeQuestionFile } from "@/lib/import/question-import-server";

export const maxDuration = 120;

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(422, "VALIDATION_FAILED", "Không đọc được file tải lên");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return apiError(422, "VALIDATION_FAILED", "Chưa chọn file");

  const result = await analyzeQuestionFile(file);
  if (!result.ok) {
    return apiError(result.status, result.status === 415 ? "UNSUPPORTED_FILE" : result.status === 413 ? "PAYLOAD_TOO_LARGE" : "VALIDATION_FAILED", result.error);
  }
  const valid = result.rows.filter((r) => r.errors.length === 0).length;
  return NextResponse.json({
    totalRows: result.rows.length,
    validRows: valid,
    errorRows: result.rows.length - valid,
    newCategories: result.newCategories,
    rows: result.rows.map((r) => ({
      row: r.rowNumber,
      category: r.question?.categoryName ?? r.raw.category,
      newCategory: Boolean(r.question && !r.question.categoryId),
      stem: r.raw.stem,
      options: [r.raw.optA, r.raw.optB, r.raw.optC, r.raw.optD, r.raw.optE, r.raw.optF].filter(Boolean),
      correct: r.raw.correct,
      difficulty: r.raw.difficulty,
      errors: r.errors,
    })),
  });
}
