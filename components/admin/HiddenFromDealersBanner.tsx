import { EyeOff } from "lucide-react";
import { ConfirmAction, type ActionResult } from "@/components/common/ConfirmAction";
import { Button } from "@/components/ui/button";

export function HiddenFromDealersBanner({
  message,
  publishLabel = "Xuất bản ngay",
  publishTitle,
  publishDescription,
  publishAction,
}: {
  message: React.ReactNode;
  publishLabel?: string;
  publishTitle: string;
  publishDescription: string;
  publishAction?: () => Promise<ActionResult>;
}) {
  return (
    <div
      role="status"
      data-testid="hidden-from-dealers"
      className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-300 bg-warning-soft px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center"
    >
      <EyeOff className="size-5 shrink-0" />
      <div className="flex-1">{message}</div>
      {publishAction && (
        <ConfirmAction
          action={publishAction}
          title={publishTitle}
          description={publishDescription}
          confirmLabel={publishLabel}
          trigger={<Button size="sm">{publishLabel}</Button>}
        />
      )}
    </div>
  );
}
