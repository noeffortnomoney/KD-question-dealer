import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { clampPage, parsePage, parsePageSize } from "@/lib/pagination";
import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { auth } from "@/lib/auth";
import { formatDateTime } from "@/lib/date-utils";
import { ensureReminders, listNotifications } from "@/lib/notifications";
import { toRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thông báo — Kymdan" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  await ensureReminders({
    userId: session.user.id,
    role: toRole(session.user.role),
    dealerId: session.user.dealerId ?? null,
  }).catch(() => {});
  let page = parsePage(sp.page);
  let data = await listNotifications(session.user.id, size, (page - 1) * size);
  if (page > 1 && data.items.length === 0 && data.total > 0) {
    page = clampPage(page, data.total, size);
    data = await listNotifications(session.user.id, size, (page - 1) * size);
  }
  const { items, unread, total } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Thông báo"
        description={unread ? `${unread} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"}
        actions={unread > 0 ? <MarkAllReadButton /> : undefined}
      />
      {items.length === 0 ? (
        <EmptyState title="Chưa có thông báo nào" />
      ) : (
        <div className="rounded-xl border bg-card">
          <ul>
            {items.map((n) => {
              const content = (
                <>
                  <NotificationIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.createdAtUtc)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />}
                </>
              );
              const cls = cn("flex gap-3 border-b px-4 py-3 last:border-b-0", !n.read && "bg-brand-soft/40");
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={`/notifications/open/${n.id}`} className={cn(cls, "hover:bg-muted")}>
                      {content}
                    </Link>
                  ) : (
                    <div className={cls}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pageSize={size} total={total} className="border-t" />
        </div>
      )}
    </div>
  );
}
