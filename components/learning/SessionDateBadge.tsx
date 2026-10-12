import { vnDateParts } from "@/lib/date-utils";

export function SessionDateBadge({ date }: { date: Date | string }) {
  const p = vnDateParts(date);
  if (!p) return null;
  return (
    <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft py-2 text-brand">
      <span className="text-[11px] font-medium">{p.weekday}</span>
      <span className="text-2xl font-bold leading-none">{p.day}</span>
      <span className="text-[11px]">{p.month}</span>
    </div>
  );
}
