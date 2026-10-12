"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  const [last, setLast] = useState<Date | null>(null);

  useEffect(() => {
    setLast(new Date());
    const timer = setInterval(() => {
      router.refresh();
      setLast(new Date());
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className="size-3.5" /> Tự cập nhật mỗi {seconds} giây
      {last && ` · lần cuối ${last.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`}
    </span>
  );
}
