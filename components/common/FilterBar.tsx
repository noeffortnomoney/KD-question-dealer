import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface FilterSelect {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}

export function FilterBar({
  basePath,
  q,
  placeholder = "Tìm kiếm…",
  selects = [],
  hidden = {},
}: {
  basePath: string;
  q?: string;
  placeholder?: string;
  selects?: FilterSelect[];
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form method="get" action={basePath} className="mb-4 flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-ring/40"
        />
      </div>
      {selects.map((s) => (
        <select
          key={s.name}
          name={s.name}
          defaultValue={s.value ?? ""}
          aria-label={s.label}
          className="h-9 rounded-md border bg-card px-3 text-sm outline-none focus:border-brand"
        >
          <option value="">{s.label}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      <Button type="submit" variant="outline" size="sm" className="h-9">
        Lọc
      </Button>
      <Button asChild variant="ghost" size="sm" className="h-9">
        <Link href={basePath}>Xóa lọc</Link>
      </Button>
    </form>
  );
}
