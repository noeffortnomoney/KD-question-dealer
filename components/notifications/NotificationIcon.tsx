import { AlertTriangle, AlarmClock, BookOpen, CalendarDays, CalendarX, ClipboardList, RotateCcw, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  course: { icon: BookOpen, className: "bg-sky-50 text-sky-600" },
  session: { icon: CalendarDays, className: "bg-success-soft text-success" },
  session_cancel: { icon: CalendarX, className: "bg-red-50 text-red-600" },
  exam: { icon: ClipboardList, className: "bg-brand-soft text-brand" },
  exam_result: { icon: Trophy, className: "bg-warning-soft text-amber-600" },
  reissue: { icon: RotateCcw, className: "bg-brand-soft text-brand" },
  reminder_session: { icon: AlarmClock, className: "bg-success-soft text-success" },
  reminder_exam: { icon: AlarmClock, className: "bg-brand-soft text-brand" },
  admin_alert: { icon: AlertTriangle, className: "bg-warning-soft text-amber-600" },
};

export function NotificationIcon({ type }: { type: string }) {
  const entry = ICONS[type] ?? ICONS.course;
  const Icon = entry.icon;
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", entry.className)}>
      <Icon className="size-4" />
    </span>
  );
}
