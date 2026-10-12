import { cn } from "@/lib/utils";

export function Brand({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className="font-brand text-[28px] font-bold tracking-tight text-brand">Kymdan</span>
      {subtitle && (
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {subtitle}
        </span>
      )}
    </div>
  );
}
