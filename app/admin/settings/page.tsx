import { KeyRound, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { CreateAdminDialog } from "@/components/admin/CreateAdminDialog";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resetAdminPasswordAction, setAdminStatusAction } from "@/lib/actions/admin/users";
import { requireAdmin } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { sameId } from "@/lib/ids";
import { ACCOUNT_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cài đặt — Kymdan" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ page?: string; size?: string }> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const g = await requireAdmin();
  const me = "error" in g ? null : g.userId;
  const allAdmins = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, status: true, lastLoginAt: true, mustChangePassword: true },
  });
  const adminPage = paginate(allAdmins, parsePage(sp.page), size);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Cài đặt"
        description="Hệ thống có đúng hai vai trò: Quản trị viên và Đại lý."
        actions={
          <Button asChild variant="outline">
            <Link href="/change-password">
              <KeyRound className="size-4" /> Đổi mật khẩu của tôi
            </Link>
          </Button>
        }
      />
      <section className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Quản trị viên ({allAdmins.length})</h2>
          <CreateAdminDialog />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Đăng nhập gần nhất</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adminPage.items.map((a) => {
              const isMe = me !== null && sameId(a.id, me);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    {a.name} {isMe && <span className="text-xs text-muted-foreground">(bạn)</span>}
                  </TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell className="text-xs">
                    {formatDateTime(a.lastLoginAt, "Chưa đăng nhập")}
                    {a.mustChangePassword && <div className="text-amber-700">Chưa đổi mật khẩu tạm</div>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={ACCOUNT_STATUS} value={a.status} />
                  </TableCell>
                  <TableCell>
                    {!isMe && (
                      <div className="flex justify-end gap-1">
                        <ResetPasswordButton label={a.email} action={resetAdminPasswordAction.bind(null, a.id)} />
                        <ConfirmAction
                          action={setAdminStatusAction.bind(null, a.id, a.status === "active" ? "locked" : "active")}
                          title={a.status === "active" ? "Khóa quản trị viên?" : "Mở khóa quản trị viên?"}
                          description={a.email}
                          confirmLabel={a.status === "active" ? "Khóa" : "Mở khóa"}
                          destructive={a.status === "active"}
                          trigger={
                            <Button size="icon-sm" variant="ghost" aria-label={a.status === "active" ? "Khóa" : "Mở khóa"}>
                              {a.status === "active" ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={adminPage.page} pageSize={size} total={adminPage.total} className="border-t" />
      </section>
      <section className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <h2 className="mb-2 font-semibold text-foreground">Thông số hệ thống</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Thời gian ân hạn khi lưu/nộp sát giờ: {Number(process.env.EXAM_GRACE_SECONDS ?? 10)} giây</li>
          <li>Khóa đăng nhập 15 phút sau 5 lần nhập sai mật khẩu</li>
          <li>Phiên đăng nhập hết hạn sau 12 giờ</li>
          <li>Múi giờ hiển thị: Asia/Ho_Chi_Minh (UTC+7)</li>
        </ul>
      </section>
    </div>
  );
}
