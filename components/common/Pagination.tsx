"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PAGE_SIZES, clampPage, pageCount, pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onChange?: (page: number, pageSize: number) => void;
  pageParam?: string;
  sizeParam?: string;
  className?: string;
}

export function Pagination({
  total,
  page,
  pageSize,
  onChange,
  pageParam = "page",
  sizeParam = "size",
  className,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total <= 0) return null;

  const pages = pageCount(total, pageSize);
  const current = clampPage(page, total, pageSize);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);

  const go = (nextPage: number, nextSize = pageSize) => {
    if (onChange) {
      onChange(nextPage, nextSize);
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) sp.set(pageParam, String(nextPage));
    else sp.delete(pageParam);
    if (nextSize !== PAGE_SIZES[0]) sp.set(sizeParam, String(nextSize));
    else sp.delete(sizeParam);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const jump = (input: HTMLInputElement) => {
    const n = Number.parseInt(input.value, 10);
    if (!Number.isFinite(n)) {
      input.value = String(current);
      return;
    }
    const target = Math.min(pages, Math.max(1, n));
    input.value = String(target);
    if (target !== current) go(target);
  };

  const arrow =
    "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-35";
  const field = "h-8 rounded-md border bg-card px-2 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-ring/30";

  return (
    <div
      className={cn("flex flex-col gap-3 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between", className)}
      data-testid="pagination"
    >
      <nav className="flex flex-wrap items-center gap-1" aria-label="Phân trang">
        <button type="button" className={arrow} onClick={() => go(1)} disabled={current === 1} aria-label="Trang đầu">
          <ChevronsLeft className="size-4" />
        </button>
        <button type="button" className={arrow} onClick={() => go(current - 1)} disabled={current === 1} aria-label="Trang trước">
          <ChevronLeft className="size-4" />
        </button>
        {pageWindow(current, pages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => go(p)}
              aria-current={p === current ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                p === current ? "bg-brand font-semibold text-white shadow-sm" : "text-foreground hover:bg-muted"
              )}
            >
              {p}
            </button>
          )
        )}
        <button type="button" className={arrow} onClick={() => go(current + 1)} disabled={current === pages} aria-label="Trang sau">
          <ChevronRight className="size-4" />
        </button>
        <button type="button" className={arrow} onClick={() => go(pages)} disabled={current === pages} aria-label="Trang cuối">
          <ChevronsRight className="size-4" />
        </button>
      </nav>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span data-testid="pagination-range" className="tabular-nums">
          Hiển thị {from}–{to} / {total}
        </span>
        <label className="flex items-center gap-2">
          Số dòng
          <select
            value={pageSize}
            onChange={(e) => go(1, Number(e.target.value))}
            className={field}
            aria-label="Số dòng mỗi trang"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Chuyển đến trang
          <input
            key={current}
            type="number"
            inputMode="numeric"
            min={1}
            max={pages}
            defaultValue={current}
            disabled={pages <= 1}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                jump(e.currentTarget);
              }
            }}
            onBlur={(e) => jump(e.currentTarget)}
            className={cn(field, "w-16 text-center tabular-nums disabled:opacity-60")}
            aria-label="Chuyển đến trang"
          />
          <span className="tabular-nums">/ {pages}</span>
        </label>
      </div>
    </div>
  );
}
