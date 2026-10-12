import ExcelJS from "exceljs";
import { parseCsv, safeCell } from "@/lib/import/dealer-import";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined && value.result !== null) return String(value.result);
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((r) => r.text).join("");
    if ("hyperlink" in value && typeof value.hyperlink === "string") return value.hyperlink;
    return "";
  }
  return String(value);
}

export async function readTable(buffer: Buffer, fileName: string): Promise<string[][]> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(buffer.toString("utf8"));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = row.values as ExcelJS.CellValue[];
    const cells: string[] = [];
    for (let i = 1; i < values.length; i++) cells.push(cellText(values[i]).trim());
    table.push(cells);
  });
  return table.filter((r) => r.some((c) => c !== ""));
}

export interface SheetSpec {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, unknown>[];
}

export async function buildWorkbook(sheets: SheetSpec[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kymdan Dealer Portal";
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name);
    sheet.columns = spec.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }));
    sheet.getRow(1).font = { bold: true };
    for (const row of spec.rows) {
      const safe: Record<string, unknown> = {};
      for (const c of spec.columns) safe[c.key] = safeCell(row[c.key]);
      sheet.addRow(safe);
    }
  }
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data as ArrayBuffer);
}

export function buildCsv(columns: { header: string; key: string }[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const cell = safeCell(v);
    const text = cell === null ? "" : String(cell);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.map((c) => escape(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escape(row[c.key])).join(","));
  return `﻿${lines.join("\r\n")}`;
}

export function fileResponse(body: Buffer | string, fileName: string, contentType: string) {
  const payload = typeof body === "string" ? body : new Uint8Array(body);
  return new Response(payload, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const CSV_TYPE = "text/csv; charset=utf-8";
