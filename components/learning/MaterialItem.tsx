"use client";

import { CheckCircle2, ExternalLink, FileText, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { completeMaterialAction, openMaterialAction } from "@/lib/actions/learning";

export function MaterialItem({
  material,
}: {
  material: { id: string; title: string; kind: string; fileName: string | null; isRequired: boolean; viewed: boolean; completedAt: Date | null };
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  const open = () => {
    const win = window.open("about:blank", "_blank");
    start(async () => {
      const res = await openMaterialAction(material.id);
      if ("url" in res && res.url) {
        if (win) win.location.href = res.url;
        else window.location.href = res.url;
        router.refresh();
      } else {
        win?.close();
        toast.error(res.error ?? "Không mở được tài liệu");
      }
    });
  };

  const complete = () =>
    start(async () => {
      const res = await completeMaterialAction(material.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Đã đánh dấu hoàn thành");
        router.refresh();
      }
    });

  const Icon = material.kind === "file" ? FileText : Link2;
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{material.title}</p>
          {material.isRequired && <ToneBadge tone="brand">Bắt buộc</ToneBadge>}
          {material.completedAt ? (
            <ToneBadge tone="success">Đã hoàn thành</ToneBadge>
          ) : material.viewed ? (
            <ToneBadge tone="info">Đã xem</ToneBadge>
          ) : null}
        </div>
        {material.fileName && <p className="truncate text-xs text-muted-foreground">{material.fileName}</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={open} disabled={pending}>
          Mở <ExternalLink className="size-3.5" />
        </Button>
        {!material.completedAt && (
          <Button size="sm" onClick={complete} disabled={pending || !material.viewed} title={material.viewed ? "" : "Mở tài liệu trước"}>
            <CheckCircle2 className="size-4" /> Hoàn thành
          </Button>
        )}
      </div>
    </div>
  );
}
