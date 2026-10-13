"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { SortDir, SortState } from "@/lib/sort";
import { Button } from "@/components/ui/button";
import { TableCell, TableHead } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function SortableHead({
  column,
  sort,
  children,
  firstDir = "asc",
  align = "left",
  className,
}: {
  column: string;
  sort: SortState;
  children: React.ReactNode;
  firstDir?: SortDir;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = sort.key === column;
  const nextDir: SortDir = active ? (sort.dir === "asc" ? "desc" : "asc") : firstDir;
  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", column);
  params.set("dir", nextDir);
  params.delete("page");
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  const label = typeof children === "string" ? children : column;

  return (
    <TableHead
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(align === "right" && "text-right", align === "center" && "text-center", className)}
    >
      <Link
        href={`${pathname}?${params.toString()}`}
        scroll={false}
        replace
        className={cn(
          "group/sort -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-background hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground"
        )}
        aria-label={`Sắp xếp theo ${label} ${nextDir === "asc" ? "tăng dần" : "giảm dần"}`}
        data-testid={`sort-${column}`}
      >
        {children}
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            active ? "text-brand" : "text-muted-foreground/50 group-hover/sort:text-muted-foreground"
          )}
          aria-hidden
        />
      </Link>
    </TableHead>
  );
}

export function ActionsHead({ label = "Thao tác" }: { label?: string }) {
  return <TableHead className="text-right">{label}</TableHead>;
}

export function ActionsCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableCell className={cn("text-right", className)}>
      <div className="inline-flex items-center justify-end gap-1">{children}</div>
    </TableCell>
  );
}

const ICON_TONES = {
  edit: "text-sky-600 hover:bg-sky-50 hover:text-sky-700",
  neutral: "text-muted-foreground hover:bg-muted hover:text-foreground",
  success: "text-success hover:bg-success-soft",
  danger: "text-red-600 hover:bg-red-50 hover:text-red-700",
} as const;

export type ActionTone = keyof typeof ICON_TONES;

export function ActionIcon({
  label,
  tone = "neutral",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; tone?: ActionTone }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={label} className={cn(ICON_TONES[tone], className)} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function RowLink({ href, icon, children }: { href: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="mr-1 border-brand/25 bg-brand-soft text-brand shadow-none hover:border-brand hover:bg-brand hover:text-white"
    >
      <Link href={href}>
        {icon}
        {children}
      </Link>
    </Button>
  );
}

export function IconLines({ icon, primary, secondary }: { icon: React.ReactNode; primary: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 leading-snug">
        <div className="font-medium tabular-nums text-foreground">{primary}</div>
        {secondary && <div className="text-[13px] tabular-nums text-muted-foreground">{secondary}</div>}
      </div>
    </div>
  );
}

export function EmptyValue({ children = "Chưa có" }: { children?: React.ReactNode }) {
  return <span className="text-muted-foreground/70">{children}</span>;
}
