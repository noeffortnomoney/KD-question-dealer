"use client";

import { BookOpenCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  available: number;
}

export function PracticeStart({ categories, sizes }: { categories: Category[]; sizes: readonly number[] }) {
  const router = useRouter();
  const total = categories.reduce((s, c) => s + c.available, 0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [size, setSize] = useState<number>(sizes[0]);
  const [pending, setPending] = useState(false);

  const start = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/practice/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, size }),
      });
      const data = (await res.json()) as { sessionId?: string; error?: string };
      if (res.ok && data.sessionId) {
        router.push(`/practice/${data.sessionId}`);
        return;
      }
      toast.error(data.error ?? "Không tạo được phiên ôn tập");
    } catch {
      toast.error("Mất kết nối. Vui lòng thử lại.");
    }
    setPending(false);
  };

  const options = [{ id: null as string | null, name: "Tất cả chủ đề", available: total }, ...categories];

  return (
    <div className="rounded-2xl border bg-card p-6">
      <h2 className="font-semibold">1. Chọn chủ đề</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((c) => (
          <button
            key={c.id ?? "all"}
            type="button"
            disabled={c.available === 0}
            onClick={() => setCategoryId(c.id)}
            className={cn(
              "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition",
              categoryId === c.id ? "border-brand bg-brand-soft" : "hover:border-brand/40",
              c.available === 0 && "cursor-not-allowed opacity-50"
            )}
          >
            <span className="font-medium">{c.name}</span>
            <span className="text-xs text-muted-foreground">{c.available} câu</span>
          </button>
        ))}
      </div>
      <h2 className="mt-6 font-semibold">2. Số câu mỗi lượt</h2>
      <div className="mt-3 flex gap-2">
        {sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-medium",
              size === s ? "bg-brand text-white" : "bg-muted hover:bg-brand-soft"
            )}
          >
            {s} câu
          </button>
        ))}
      </div>
      <Button className="mt-6 h-11 px-6" onClick={start} disabled={pending || total === 0}>
        <BookOpenCheck className="size-4" /> {pending ? "Đang tạo…" : "Bắt đầu luyện tập"}
      </Button>
      {total === 0 && <p className="mt-2 text-sm text-muted-foreground">Hiện chưa có câu hỏi nào dành cho luyện tập.</p>}
    </div>
  );
}
