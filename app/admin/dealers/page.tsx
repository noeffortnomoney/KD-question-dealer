import { Download, Lock, Pencil, Plus, Unlock, Upload } from "lucide-react";
import Link from "next/link";
import { DealerDialog } from "@/components/admin/DealerDialog";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { clampPage, parsePage, parsePageSize } from "@/lib/pagination";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resetDealerPasswordAction, setDealerStatusAction } from "@/lib/actions/admin/dealers";
import { formatDateTime } from "@/lib/date-utils";
import { ACCOUNT_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { dealerWhere, listRegions } from "@/lib/queries/dealers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý đại lý — Kymdan" };

type SP = { q?: string; region?: string; status?: string; page?: string; size?: string };

export default async function DealersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const where = dealerWhere(sp);
  const total = await prisma.dealer.count({ where });
  const page = clampPage(parsePage(sp.page), total, size);

  const [dealers, regions] = await Promise.all([
    prisma.dealer.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * size,
      take: size,
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        region: true,
        status: true,
        users: { select: { name: true, email: true, lastLoginAt: true }, take: 1 },
      },
    }),
    listRegions(),
  ]);

  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "page" && k !== "size" && v) as [string, string][]).toString();

  return (
    <div>
      <PageHeader
        title="Quản lý đại lý"
        description={`${total} đại lý`}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/api/admin/dealers/export${exportQs ? `?${exportQs}` : ""}`}>
                <Download className="size-4" /> Xuất Excel
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/dealers/import">
                <Upload className="size-4" /> Import Excel/CSV
              </Link>
            </Button>
            <DealerDialog
              regions={regions}
              trigger={
                <Button>
                  <Plus className="size-4" /> Thêm đại lý
                </Button>
              }
            />
          </>
        }
      />
      <FilterBar
        basePath="/admin/dealers"
        q={sp.q}
        placeholder="Tìm theo mã, tên đại lý, email…"
        selects={[
          { name: "region", label: "Tất cả khu vực", value: sp.region, options: regions.map((r) => ({ value: r, label: r })) },
          {
            name: "status",
            label: "Tất cả trạng thái",
            value: sp.status,
            options: [
              { value: "active", label: "Hoạt động" },
              { value: "locked", label: "Đã khóa" },
            ],
          },
        ]}
      />
      {dealers.length === 0 ? (
        <EmptyState title="Không có đại lý" description="Thử đổi bộ lọc hoặc thêm đại lý mới." />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên đại lý</TableHead>
                <TableHead>Người dùng / Email</TableHead>
                <TableHead>Khu vực</TableHead>
                <TableHead>Đăng nhập gần nhất</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealers.map((d) => {
                const u = d.users[0];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-semibold">{d.code}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <div>{u?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u?.email}</div>
                    </TableCell>
                    <TableCell>{d.region ?? "—"}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(u?.lastLoginAt, "Chưa đăng nhập")}</TableCell>
                    <TableCell>
                      <StatusBadge map={ACCOUNT_STATUS} value={d.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <DealerDialog
                          dealerId={d.id}
                          regions={regions}
                          initial={{
                            code: d.code,
                            name: d.name,
                            phone: d.phone ?? "",
                            region: d.region ?? "",
                            userName: u?.name ?? "",
                            email: u?.email ?? "",
                          }}
                          trigger={
                            <Button size="icon-sm" variant="ghost" title="Sửa" aria-label="Sửa">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <ResetPasswordButton label={`${d.code} — ${d.name}`} action={resetDealerPasswordAction.bind(null, d.id)} />
                        {d.status === "active" ? (
                          <ConfirmAction
                            action={setDealerStatusAction.bind(null, d.id, "locked")}
                            title="Khóa tài khoản đại lý?"
                            description={
                              <>
                                Đại lý <b>{d.code} — {d.name}</b> sẽ không đăng nhập, bắt đầu thi hay nộp bài được cho tới khi mở khóa.
                              </>
                            }
                            confirmLabel="Khóa tài khoản"
                            destructive
                            trigger={
                              <Button size="icon-sm" variant="ghost" title="Khóa" aria-label="Khóa">
                                <Lock className="size-4" />
                              </Button>
                            }
                          />
                        ) : (
                          <ConfirmAction
                            action={setDealerStatusAction.bind(null, d.id, "active")}
                            title="Mở khóa tài khoản?"
                            description={
                              <>
                                Đại lý <b>{d.code} — {d.name}</b> sẽ đăng nhập lại được.
                              </>
                            }
                            confirmLabel="Mở khóa"
                            trigger={
                              <Button size="icon-sm" variant="ghost" title="Mở khóa" aria-label="Mở khóa">
                                <Unlock className="size-4" />
                              </Button>
                            }
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={size} total={total} className="border-t" />
        </div>
      )}
    </div>
  );
}
