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

  const btn = "flex h-8 min-w-8 items-center justify-center rounded-md border bg-card px-2 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

  return (
    <div
      className={cn("flex flex-col gap-3 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between", className)}
      data-testid="pagination"
    >
      <div className="flex items-center gap-4">
        <span data-testid="pagination-range">
          Hiển thị {from}–{to} / {total}
        </span>
        <label className="flex items-center gap-2">
          Số dòng
          <select
            value={pageSize}
            onChange={(e) => go(1, Number(e.target.value))}
            className="h-8 rounded-md border bg-card px-2 text-sm text-foreground outline-none focus:border-brand"
            aria-label="Số dòng mỗi trang"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Phân trang">
          <button type="button" className={btn} onClick={() => go(1)} disabled={current === 1} aria-label="Trang đầu">
            <ChevronsLeft className="size-4" />
          </button>
          <button type="button" className={btn} onClick={() => go(current - 1)} disabled={current === 1} aria-label="Trang trước">
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
                className={cn(btn, p === current && "border-brand bg-brand text-white hover:bg-brand")}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className={btn} onClick={() => go(current + 1)} disabled={current === pages} aria-label="Trang sau">
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className={btn} onClick={() => go(pages)} disabled={current === pages} aria-label="Trang cuối">
            <ChevronsRight className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
