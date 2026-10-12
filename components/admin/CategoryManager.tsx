"use client";

import { Check, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { inputClass } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { saveCategoryAction, setCategoryStatusAction } from "@/lib/actions/admin/questions";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  status: string;
  sortOrder: number;
  count: number;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        setEditing(null);
        setName("");
        router.refresh();
      }
    });

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 font-semibold">Chủ đề</h2>
      <ul className="space-y-1">
        {categories.map((c) => (
          <li key={c.id} className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted", c.status !== "active" && "opacity-50")}>
            {editing === c.id ? (
              <>
                <input className={cn(inputClass, "h-8")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <Button size="icon-sm" onClick={() => run(() => saveCategoryAction(c.id, { name, sortOrder: c.sortOrder }))} disabled={pending} aria-label="Lưu">
                  <Check className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Hủy">
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Sửa chủ đề"
                  onClick={() => {
                    setEditing(c.id);
                    setName(c.name);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-brand"
                  onClick={() => run(() => setCategoryStatusAction(c.id, c.status === "active" ? "archived" : "active"))}
                >
                  {c.status === "active" ? "Ẩn" : "Hiện"}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <div className="mt-3 flex gap-2">
          <input className={cn(inputClass, "h-8")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên chủ đề" autoFocus />
          <Button size="icon-sm" onClick={() => run(() => saveCategoryAction(null, { name, sortOrder: categories.length }))} disabled={pending} aria-label="Lưu">
            <Check className="size-4" />
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          onClick={() => {
            setEditing("new");
            setName("");
          }}
        >
          <Plus className="size-4" /> Thêm chủ đề
        </Button>
      )}
    </div>
  );
}
