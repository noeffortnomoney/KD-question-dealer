export type SortDir = "asc" | "desc";

export interface SortState<K extends string = string> {
  key: K;
  dir: SortDir;
}

type Param = string | string[] | undefined;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSort<K extends string>(
  sp: { sort?: Param; dir?: Param },
  keys: readonly K[],
  fallback: SortState<K>
): SortState<K> {
  const key = first(sp.sort);
  const dir = first(sp.dir);
  if (!key || !(keys as readonly string[]).includes(key)) return fallback;
  return { key: key as K, dir: dir === "desc" ? "desc" : "asc" };
}

export type SortValue = string | number | boolean | Date | null | undefined;

const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true });

function compareValues(a: SortValue, b: SortValue): number {
  if (a instanceof Date) a = a.getTime();
  if (b instanceof Date) b = b.getTime();
  if (typeof a === "boolean") a = a ? 1 : 0;
  if (typeof b === "boolean") b = b ? 1 : 0;
  if (typeof a === "string" && typeof b === "string") return collator.compare(a, b);
  return (a as number) - (b as number);
}

export function sortRows<T>(rows: readonly T[], get: (row: T) => SortValue, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((x, y) => {
      const xEmpty = x.value === null || x.value === undefined || x.value === "";
      const yEmpty = y.value === null || y.value === undefined || y.value === "";
      if (xEmpty || yEmpty) return xEmpty === yEmpty ? x.index - y.index : xEmpty ? 1 : -1;
      return compareValues(x.value, y.value) * sign || x.index - y.index;
    })
    .map((x) => x.row);
}
