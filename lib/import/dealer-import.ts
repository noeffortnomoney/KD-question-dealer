export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 5000;

export const TEMPLATE_COLUMNS = [
  { key: "code", header: "Mã đại lý", required: true, max: 50 },
  { key: "dealerName", header: "Tên đại lý", required: true, max: 200 },
  { key: "userName", header: "Họ tên người dùng", required: true, max: 200 },
  { key: "email", header: "Email đăng nhập", required: true, max: 320 },
  { key: "phone", header: "Số điện thoại", required: false, max: 30 },
  { key: "region", header: "Khu vực", required: false, max: 100 },
] as const;

export type ImportKey = (typeof TEMPLATE_COLUMNS)[number]["key"];
export type DealerImportRow = Record<ImportKey, string>;

export interface RowError {
  column: string;
  code: "REQUIRED" | "INVALID_FORMAT" | "DUPLICATE_IN_FILE" | "ALREADY_EXISTS" | "TOO_LONG";
  message: string;
}

export interface ValidatedRow {
  rowNumber: number;
  data: DealerImportRow;
  errors: RowError[];
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "");
  const delimiter = (input.split(/\r?\n/, 1)[0].match(/;/g)?.length ?? 0) > (input.split(/\r?\n/, 1)[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function mapRows(table: string[][]): { rows: { rowNumber: number; data: DealerImportRow }[]; missing: string[] } {
  if (table.length === 0) return { rows: [], missing: TEMPLATE_COLUMNS.filter((c) => c.required).map((c) => c.header) };
  const header = table[0].map((h) => normalizeHeader(String(h ?? "")));
  const index = new Map<ImportKey, number>();
  for (const col of TEMPLATE_COLUMNS) {
    const pos = header.indexOf(normalizeHeader(col.header));
    if (pos >= 0) index.set(col.key, pos);
  }
  const missing = TEMPLATE_COLUMNS.filter((c) => c.required && !index.has(c.key)).map((c) => c.header);

  const rows = table.slice(1).map((cells, i) => {
    const data = {} as DealerImportRow;
    for (const col of TEMPLATE_COLUMNS) {
      const pos = index.get(col.key);
      data[col.key] = pos === undefined ? "" : String(cells[pos] ?? "").trim();
    }
    data.email = data.email.toLowerCase();
    data.code = data.code.toUpperCase();
    return { rowNumber: i + 2, data };
  });
  return { rows, missing };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^[A-Z0-9_.-]+$/;
const PHONE_RE = /^[0-9+ .()-]+$/;

export function validateRows(
  rows: { rowNumber: number; data: DealerImportRow }[],
  existing: { codes: Set<string>; emails: Set<string> }
): ValidatedRow[] {
  const seenCodes = new Map<string, number>();
  const seenEmails = new Map<string, number>();

  return rows.map(({ rowNumber, data }) => {
    const errors: RowError[] = [];
    for (const col of TEMPLATE_COLUMNS) {
      const value = data[col.key];
      if (col.required && !value) {
        errors.push({ column: col.header, code: "REQUIRED", message: `${col.header} là bắt buộc` });
      } else if (value.length > col.max) {
        errors.push({ column: col.header, code: "TOO_LONG", message: `${col.header} tối đa ${col.max} ký tự` });
      }
    }

    if (data.code && !CODE_RE.test(data.code)) {
      errors.push({ column: "Mã đại lý", code: "INVALID_FORMAT", message: "Mã đại lý chỉ gồm chữ, số, dấu - _ ." });
    }
    if (data.email && !EMAIL_RE.test(data.email)) {
      errors.push({ column: "Email đăng nhập", code: "INVALID_FORMAT", message: "Email không hợp lệ" });
    }
    if (data.phone && !PHONE_RE.test(data.phone)) {
      errors.push({ column: "Số điện thoại", code: "INVALID_FORMAT", message: "Số điện thoại không hợp lệ" });
    }

    if (data.code) {
      const first = seenCodes.get(data.code);
      if (first !== undefined) {
        errors.push({ column: "Mã đại lý", code: "DUPLICATE_IN_FILE", message: `Mã đại lý trùng với dòng ${first}` });
      } else {
        seenCodes.set(data.code, rowNumber);
        if (existing.codes.has(data.code)) {
          errors.push({ column: "Mã đại lý", code: "ALREADY_EXISTS", message: "Mã đại lý đã tồn tại trong hệ thống" });
        }
      }
    }
    if (data.email) {
      const first = seenEmails.get(data.email);
      if (first !== undefined) {
        errors.push({ column: "Email đăng nhập", code: "DUPLICATE_IN_FILE", message: `Email trùng với dòng ${first}` });
      } else {
        seenEmails.set(data.email, rowNumber);
        if (existing.emails.has(data.email)) {
          errors.push({ column: "Email đăng nhập", code: "ALREADY_EXISTS", message: "Email đã tồn tại trong hệ thống" });
        }
      }
    }

    return { rowNumber, data, errors };
  });
}

export function safeCell(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}
