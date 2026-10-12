"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelative } from "@/lib/date-utils";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch("/api/notifications?limit=15", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { unread: number; items: NotificationItem[] };
        setItems(data.items);
        setUnread(data.unread);
        setLoaded(true);
      }
    } catch {
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    void load();
  }, [pathname, load]);

  const markRead = async (body: { ids: string[] } | { all: true }) => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  };

  const openItem = (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      void markRead({ ids: [n.id] });
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await markRead({ all: true });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void load();
      }}
    >
      <PopoverTrigger
        className="relative flex size-10 items-center justify-center rounded-full text-foreground/70 outline-none hover:bg-muted hover:text-foreground"
        aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        data-testid="notification-bell"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ring-2 ring-card"
            data-testid="notification-count"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0" data-testid="notification-panel">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Thông báo</p>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              <CheckCheck className="size-3.5" /> Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
        <div className="max-h-105 overflow-y-auto">
          {!loaded ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Đang tải…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Chưa có thông báo nào</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn("flex w-full gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted", !n.read && "bg-brand-soft/40")}
                    data-testid="notification-item"
                  >
                    <NotificationIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", !n.read && "font-semibold")}>{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-muted-foreground">{formatRelative(n.createdAtUtc)}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label="Chưa đọc" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href="/notifications"
          onClick={() => setOpen(false)}
          className="block border-t px-4 py-2.5 text-center text-sm font-medium text-brand hover:bg-muted"
        >
          Xem tất cả
        </Link>
      </PopoverContent>
    </Popover>
  );
}
