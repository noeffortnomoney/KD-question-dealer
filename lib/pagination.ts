export const PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;

type Param = string | string[] | undefined;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: Param): number {
  const n = Number(first(value));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function parsePageSize(value: Param): number {
  const n = Number(first(value));
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export function clampPage(page: number, total: number, size: number): number {
  return Math.min(Math.max(1, page), pageCount(total, size));
}

export function paginate<T>(items: T[], page: number, size: number) {
  const p = clampPage(page, items.length, size);
  return { items: items.slice((p - 1) * size, p * size), page: p, total: items.length, offset: (p - 1) * size };
}

export function pageWindow(page: number, pages: number, span = 5): (number | "…")[] {
  if (pages <= span + 2) return Array.from({ length: pages }, (_, i) => i + 1);
  const half = Math.floor(span / 2);
  let start = Math.max(2, page - half);
  const end = Math.min(pages - 1, start + span - 1);
  start = Math.max(2, end - span + 1);
  const out: (number | "…")[] = [1];
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}
