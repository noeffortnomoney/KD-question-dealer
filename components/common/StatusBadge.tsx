import type { Label, Tone } from "@/lib/labels";
import { cn } from "@/lib/utils";

const TONES: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-amber-700",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-red-50 text-red-700",
  info: "bg-sky-50 text-sky-700",
};

export function ToneBadge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ map, value, className }: { map: Record<string, Label>; value: string; className?: string }) {
  const label = map[value] ?? { text: value, tone: "muted" as const };
  return (
    <ToneBadge tone={label.tone} className={cn("gap-1.5 pl-2", className)}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {label.text}
    </ToneBadge>
  );
}
