import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "brand" | "success" | "warning" | "info";
}) {
  const toneClass = {
    brand: "bg-brand-soft text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-amber-600",
    info: "bg-sky-50 text-sky-600",
  }[tone];
  return (
    <div className="card-lift flex items-start justify-between rounded-xl border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <span className={cn("flex size-11 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="size-5" />
        </span>
      )}
    </div>
  );
}
