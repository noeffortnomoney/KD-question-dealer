import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { apiError, guardResponse } from "@/lib/http";
import { analyzeQuestionFile } from "@/lib/import/question-import-server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

const BATCH = 50;

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
  const publish = form.get("publish") === "true";
  if (!(file instanceof File)) return apiError(422, "VALIDATION_FAILED", "Chưa chọn file");

  const result = await analyzeQuestionFile(file);
  if (!result.ok) return apiError(result.status, "VALIDATION_FAILED", result.error);
  const valid = result.rows.filter((r) => r.question);
  if (valid.length === 0) return apiError(422, "VALIDATION_FAILED", "Không có câu hỏi hợp lệ để import");

  const categoryIds = new Map<string, string>();
  for (const r of valid) if (r.question!.categoryId) categoryIds.set(r.question!.categoryKey, r.question!.categoryId);
  const maxSort = await prisma.questionCategory.aggregate({ _max: { sortOrder: true } });
  let sortOrder = (maxSort._max.sortOrder ?? 0) + 1;
  const createdCategories: string[] = [];
  for (const name of result.newCategories) {
    const key = valid.find((r) => r.question!.categoryName === name)!.question!.categoryKey;
    const created = await prisma.questionCategory.create({ data: { name, sortOrder: sortOrder++ }, select: { id: true } });
    categoryIds.set(key, created.id);
    createdCategories.push(name);
  }

  const now = new Date();
  let created = 0;
  for (let i = 0; i < valid.length; i += BATCH) {
    const part = valid.slice(i, i + BATCH);
    await prisma.$transaction(
      part.map((r) => {
        const q = r.question!;
        return prisma.question.create({
          data: {
            categoryId: categoryIds.get(q.categoryKey)!,
            stem: q.stem,
            explanation: q.explanation || null,
            difficulty: q.difficulty,
            status: publish ? "published" : "draft",
            publishedAt: publish ? now : null,
            createdById: guard.userId,
            options: { create: q.options.map((text, idx) => ({ text, isCorrect: idx === q.correctIndex, sortOrder: idx + 1 })) },
          },
          select: { id: true },
        });
      })
    );
    created += part.length;
  }

  await writeAudit({
    actorUserId: guard.userId,
    action: "Question.Import",
    entityType: "Question",
    details: { fileName: file.name, created, skipped: result.rows.length - valid.length, publish, createdCategories },
  });
  revalidatePath("/admin/questions");

  return NextResponse.json({
    created,
    skipped: result.rows.length - valid.length,
    published: publish,
    createdCategories,
  });
}
