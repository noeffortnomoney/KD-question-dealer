import { readTable } from "@/lib/import/excel";
import {
  QUESTION_IMPORT_MAX_BYTES,
  QUESTION_IMPORT_MAX_ROWS,
  foldText,
  mapQuestionRows,
  stemKey,
  validateQuestionRows,
  type ValidatedQuestionRow,
} from "@/lib/import/question-import";
import { prisma } from "@/lib/prisma";

export type AnalyzeResult =
  | { ok: false; status: number; error: string }
  | { ok: true; rows: ValidatedQuestionRow[]; newCategories: string[] };

function looksLikeXlsx(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

export async function analyzeQuestionFile(file: File): Promise<AnalyzeResult> {
  if (file.size > QUESTION_IMPORT_MAX_BYTES) return { ok: false, status: 413, error: "File vượt quá 5 MB" };
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!name.endsWith(".csv") && !(name.endsWith(".xlsx") && looksLikeXlsx(buffer))) {
    return { ok: false, status: 415, error: "Chỉ nhận file .xlsx hoặc .csv" };
  }

  let table: string[][];
  try {
    table = await readTable(buffer, name);
  } catch {
    return { ok: false, status: 422, error: "File không đúng định dạng" };
  }
  const { rows, missing } = mapQuestionRows(table);
  if (missing.length) return { ok: false, status: 422, error: `Thiếu cột bắt buộc: ${missing.join(", ")}` };
  if (rows.length === 0) return { ok: false, status: 422, error: "File không có dòng dữ liệu" };
  if (rows.length > QUESTION_IMPORT_MAX_ROWS) {
    return { ok: false, status: 422, error: `Tối đa ${QUESTION_IMPORT_MAX_ROWS} câu hỏi mỗi lần import` };
  }

  const categoryRows = await prisma.questionCategory.findMany({ select: { id: true, name: true, status: true } });
  const categories = new Map<string, { id: string; name: string }>();
  for (const c of categoryRows.sort((a, b) => (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1))) {
    const key = foldText(c.name);
    if (!categories.has(key)) categories.set(key, { id: c.id, name: c.name });
  }

  const involved = [...new Set(rows.map((r) => foldText(r.raw.category)).filter((k) => categories.has(k)))].map(
    (k) => categories.get(k)!.id
  );
  const existingStems = new Set<string>();
  if (involved.length) {
    const existing = await prisma.question.findMany({
      where: { categoryId: { in: involved }, status: { not: "archived" } },
      select: { stem: true, category: { select: { name: true } } },
    });
    for (const q of existing) existingStems.add(`${foldText(q.category.name)}|${stemKey(q.stem)}`);
  }

  const validated = validateQuestionRows(rows, { categories, existingStems });
  const newCategories = [
    ...new Map(
      validated.filter((r) => r.question && !r.question.categoryId).map((r) => [r.question!.categoryKey, r.question!.categoryName])
    ).values(),
  ];
  return { ok: true, rows: validated, newCategories };
}
