"use client";

import { ArrowDown, ArrowUp, ExternalLink, FileText, Link2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { Field, inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { addLinkMaterialAction, deleteMaterialAction, moveMaterialAction } from "@/lib/actions/admin/sessions";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  fileName: string | null;
}

export function MaterialManager({ sessionId, materials }: { sessionId: string; materials: Material[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"link" | "file">("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (fn: () => Promise<{ error?: string; message?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(res.message ?? "Đã lưu");
        router.refresh();
      }
    });

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await addLinkMaterialAction(sessionId, { title, url });
      if (!res.error) {
        setTitle("");
        setUrl("");
      }
      return res;
    });
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Chọn file cần tải lên");
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("title", title || file.name);
    try {
      const res = await fetch(`/api/admin/training-sessions/${sessionId}/materials`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Đã tải lên");
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Tải lên thất bại");
    }
    setUploading(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-2">
        {materials.length === 0 && (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            Chưa có tài liệu. Đính kèm slide, bảng giá, chính sách… để đại lý xem trước hoặc sau buổi training.
          </p>
        )}
        {materials.map((m, i) => {
          const Icon = m.kind === "file" ? FileText : Link2;
          return (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <Icon className="size-5 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                <p className="truncate text-xs text-muted-foreground">{m.kind === "file" ? m.fileName : m.url}</p>
              </div>
              <a
                href={m.kind === "file" ? `/api/materials/${m.id}/download` : m.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1.5 hover:bg-muted"
                aria-label="Mở tài liệu"
              >
                <ExternalLink className="size-4" />
              </a>
              <Button size="icon-sm" variant="ghost" disabled={pending || i === 0} onClick={() => run(() => moveMaterialAction(m.id, "up"))} aria-label="Lên">
                <ArrowUp className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending || i === materials.length - 1}
                onClick={() => run(() => moveMaterialAction(m.id, "down"))}
                aria-label="Xuống"
              >
                <ArrowDown className="size-4" />
              </Button>
              <ConfirmAction
                action={() => deleteMaterialAction(m.id)}
                title="Xóa tài liệu?"
                description={`Tài liệu "${m.title}" sẽ bị xóa, đại lý không mở được nữa.`}
                confirmLabel="Xóa"
                destructive
                trigger={
                  <Button size="icon-sm" variant="ghost" disabled={pending} aria-label="Xóa">
                    <Trash2 className="size-4" />
                  </Button>
                }
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["link", "file"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={cn("flex-1 rounded-md py-1.5 font-medium", mode === k ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              {k === "link" ? "Thêm link" : "Tải file lên"}
            </button>
          ))}
        </div>
        <form onSubmit={mode === "link" ? addLink : upload} className="space-y-3">
          <Field label="Tiêu đề" required={mode === "link"}>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required={mode === "link"} />
          </Field>
          {mode === "link" ? (
            <Field key="url-field" label="Đường dẫn" required hint="Google Drive, YouTube, website…">
              <input type="url" className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
            </Field>
          ) : (
            <Field key="file-field" label="File" required hint="PDF, DOCX, XLSX, PPTX, PNG, JPG, MP4 — tối đa 25 MB. Để trống tiêu đề sẽ dùng tên file">
              <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.mp4" className="text-sm" />
            </Field>
          )}
          <Button type="submit" className="w-full" disabled={pending || uploading}>
            {mode === "link" ? "Thêm tài liệu" : uploading ? "Đang tải lên…" : (
              <>
                <Upload className="size-4" /> Tải lên
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
