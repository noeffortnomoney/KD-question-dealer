export const QUESTION_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const QUESTION_IMPORT_MAX_ROWS = 2000;
export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export const QUESTION_COLUMNS = [
  { key: "category", header: "Chủ đề", required: true },
  { key: "stem", header: "Nội dung câu hỏi", required: true },
  { key: "optA", header: "Đáp án A", required: true },
  { key: "optB", header: "Đáp án B", required: true },
  { key: "optC", header: "Đáp án C", required: false },
  { key: "optD", header: "Đáp án D", required: false },
  { key: "optE", header: "Đáp án E", required: false },
  { key: "optF", header: "Đáp án F", required: false },
  { key: "correct", header: "Đáp án đúng", required: true },
  { key: "explanation", header: "Giải thích", required: false },
  { key: "difficulty", header: "Độ khó", required: false },
] as const;

type ColumnKey = (typeof QUESTION_COLUMNS)[number]["key"];
export type RawQuestionRow = Record<ColumnKey, string>;

export interface QuestionRowError {
  column: string;
  message: string;
}

export interface ParsedQuestion {
  categoryName: string;
  categoryKey: string;
  categoryId: string | null;
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: number;
}

export interface ValidatedQuestionRow {
  rowNumber: number;
  raw: RawQuestionRow;
  question: ParsedQuestion | null;
  errors: QuestionRowError[];
}

export function foldText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function stemKey(stem: string): string {
  return stem.toLowerCase().replace(/\s+/g, " ").trim();
}

function headerKey(value: string): string {
  return foldText(value).replace(/[^a-z0-9]/g, "");
}

export function mapQuestionRows(table: string[][]): { rows: { rowNumber: number; raw: RawQuestionRow }[]; missing: string[] } {
  if (table.length === 0) {
    return { rows: [], missing: QUESTION_COLUMNS.filter((c) => c.required).map((c) => c.header) };
  }
  const header = table[0].map((h) => headerKey(String(h ?? "")));
  const index = new Map<ColumnKey, number>();
  for (const col of QUESTION_COLUMNS) {
    const pos = header.indexOf(headerKey(col.header));
    if (pos >= 0) index.set(col.key, pos);
  }
  const missing = QUESTION_COLUMNS.filter((c) => c.required && !index.has(c.key)).map((c) => c.header);
  const rows = table.slice(1).map((cells, i) => {
    const raw = {} as RawQuestionRow;
    for (const col of QUESTION_COLUMNS) {
      const pos = index.get(col.key);
      raw[col.key] = pos === undefined ? "" : String(cells[pos] ?? "").trim();
    }
    return { rowNumber: i + 2, raw };
  });
  return { rows, missing };
}

const DIFFICULTY_WORDS: Record<string, number> = { de: 1, "1": 1, "trung binh": 2, tb: 2, "2": 2, kho: 3, "3": 3 };

export function parseDifficulty(value: string): number | null {
  if (!value.trim()) return 2;
  return DIFFICULTY_WORDS[foldText(value)] ?? null;
}

export function parseCorrect(value: string): number | null {
  const v = value.trim().toUpperCase().replace(/^(DAP AN|ĐÁP ÁN)\s*/i, "").replace(/[.)\s]/g, "");
  const letter = OPTION_LETTERS.indexOf(v as (typeof OPTION_LETTERS)[number]);
  if (letter >= 0) return letter;
  if (/^[1-6]$/.test(v)) return Number(v) - 1;
  return null;
}

export function validateQuestionRows(
  rows: { rowNumber: number; raw: RawQuestionRow }[],
  ctx: { categories: Map<string, { id: string; name: string }>; existingStems: Set<string> }
): ValidatedQuestionRow[] {
  const seen = new Map<string, number>();
  return rows.map(({ rowNumber, raw }) => {
    const errors: QuestionRowError[] = [];
    const categoryName = raw.category.replace(/\s+/g, " ").trim();
    const stem = raw.stem.trim();
    const optionCells = [raw.optA, raw.optB, raw.optC, raw.optD, raw.optE, raw.optF];

    if (!categoryName) errors.push({ column: "Chủ đề", message: "Chủ đề là bắt buộc" });
    else if (categoryName.length > 200) errors.push({ column: "Chủ đề", message: "Chủ đề tối đa 200 ký tự" });

    if (!stem) errors.push({ column: "Nội dung câu hỏi", message: "Nội dung câu hỏi là bắt buộc" });
    else if (stem.length < 5) errors.push({ column: "Nội dung câu hỏi", message: "Nội dung câu hỏi tối thiểu 5 ký tự" });
    else if (stem.length > 4000) errors.push({ column: "Nội dung câu hỏi", message: "Nội dung câu hỏi tối đa 4000 ký tự" });

    const lastFilled = optionCells.reduce((last, v, i) => (v ? i : last), -1);
    const gap = optionCells.slice(0, lastFilled + 1).findIndex((v) => !v);
    if (!raw.optA || !raw.optB) errors.push({ column: "Đáp án A/B", message: "Cần ít nhất 2 lựa chọn (A và B)" });
    else if (gap >= 0) {
      errors.push({ column: `Đáp án ${OPTION_LETTERS[gap]}`, message: `Đáp án ${OPTION_LETTERS[gap]} bị trống trong khi có đáp án phía sau` });
    }
    const options = optionCells.slice(0, lastFilled + 1);
    if (options.some((o) => o.length > 1000)) errors.push({ column: "Đáp án", message: "Mỗi lựa chọn tối đa 1000 ký tự" });
    if (new Set(options.map(stemKey)).size !== options.length) {
      errors.push({ column: "Đáp án", message: "Có hai lựa chọn giống nhau" });
    }

    const correctIndex = raw.correct ? parseCorrect(raw.correct) : null;
    if (!raw.correct) errors.push({ column: "Đáp án đúng", message: "Đáp án đúng là bắt buộc" });
    else if (correctIndex === null) errors.push({ column: "Đáp án đúng", message: "Đáp án đúng phải là một chữ A–F" });
    else if (!options[correctIndex]) {
      errors.push({ column: "Đáp án đúng", message: `Đáp án đúng là ${OPTION_LETTERS[correctIndex]} nhưng ô Đáp án ${OPTION_LETTERS[correctIndex]} trống` });
    }

    const difficulty = parseDifficulty(raw.difficulty);
    if (difficulty === null) errors.push({ column: "Độ khó", message: "Độ khó phải là Dễ, Trung bình hoặc Khó" });
    if (raw.explanation.length > 4000) errors.push({ column: "Giải thích", message: "Giải thích tối đa 4000 ký tự" });

    const categoryKey = foldText(categoryName);
    if (categoryName && stem) {
      const key = `${categoryKey}|${stemKey(stem)}`;
      const first = seen.get(key);
      if (first !== undefined) {
        errors.push({ column: "Nội dung câu hỏi", message: `Trùng với câu hỏi ở dòng ${first}` });
      } else {
        seen.set(key, rowNumber);
        if (ctx.existingStems.has(key)) {
          errors.push({ column: "Nội dung câu hỏi", message: "Câu hỏi đã tồn tại trong chủ đề này" });
        }
      }
    }

    const category = ctx.categories.get(categoryKey);
    return {
      rowNumber,
      raw,
      errors,
      question:
        errors.length === 0
          ? {
              categoryName: category?.name ?? categoryName,
              categoryKey,
              categoryId: category?.id ?? null,
              stem,
              options,
              correctIndex: correctIndex!,
              explanation: raw.explanation.trim(),
              difficulty: difficulty!,
            }
          : null,
    };
  });
}
