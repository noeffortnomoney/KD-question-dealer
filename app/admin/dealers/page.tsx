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
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { ActionIcon, ActionsCell, ActionsHead, EmptyValue, SortableHead } from "@/components/common/TableParts";
import { parseSort } from "@/lib/sort";
import { resetDealerPasswordAction, setDealerStatusAction } from "@/lib/actions/admin/dealers";
import { formatDateTime } from "@/lib/date-utils";
import { ACCOUNT_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { dealerWhere, listRegions } from "@/lib/queries/dealers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản lý đại lý — Kymdan" };

type SP = { q?: string; region?: string; status?: string; page?: string; size?: string; sort?: string; dir?: string };

const SORT_KEYS = ["createdAt", "code", "name", "region", "status"] as const;

export default async function DealersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const sort = parseSort(sp, SORT_KEYS, { key: "createdAt", dir: "desc" });
  const where = dealerWhere(sp);
  const total = await prisma.dealer.count({ where });
  const page = clampPage(parsePage(sp.page), total, size);

  const [dealers, regions] = await Promise.all([
    prisma.dealer.findMany({
      where,
      orderBy: sort.key === "createdAt" ? [{ createdAt: sort.dir }, { code: "asc" }] : [{ [sort.key]: sort.dir }, { createdAt: "desc" }],
      skip: (page - 1) * size,
      take: size,
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        region: true,
        status: true,
        createdAt: true,
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
        hidden={{ sort: sp.sort, dir: sp.dir }}
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
                <SttHead />
                <SortableHead column="code" sort={sort}>Mã</SortableHead>
                <SortableHead column="name" sort={sort}>Tên đại lý</SortableHead>
                <TableHead>Người dùng / Email</TableHead>
                <SortableHead column="region" sort={sort}>Khu vực</SortableHead>
                <TableHead>Đăng nhập gần nhất</TableHead>
                <SortableHead column="status" sort={sort}>Trạng thái</SortableHead>
                <SortableHead column="createdAt" sort={sort} firstDir="desc">Ngày tạo</SortableHead>
                <ActionsHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealers.map((d, i) => {
                const u = d.users[0];
                return (
                  <TableRow key={d.id}>
                    <SttCell n={(page - 1) * size + i + 1} />
                    <TableCell className="font-mono text-xs font-semibold">{d.code}</TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <div>{u?.name ?? <EmptyValue>Chưa có tài khoản</EmptyValue>}</div>
                      <div className="text-xs text-muted-foreground">{u?.email}</div>
                    </TableCell>
                    <TableCell>{d.region ?? <EmptyValue>Chưa phân vùng</EmptyValue>}</TableCell>
                    <TableCell className="tabular-nums">
                      {u?.lastLoginAt ? formatDateTime(u.lastLoginAt) : <EmptyValue>Chưa đăng nhập</EmptyValue>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge map={ACCOUNT_STATUS} value={d.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDateTime(d.createdAt)}</TableCell>
                    <ActionsCell>
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
                            <ActionIcon label="Sửa" tone="edit">
                              <Pencil className="size-4" />
                            </ActionIcon>
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
                              <ActionIcon label="Khóa" tone="danger">
                                <Lock className="size-4" />
                              </ActionIcon>
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
                              <ActionIcon label="Mở khóa" tone="success">
                                <Unlock className="size-4" />
                              </ActionIcon>
                            }
                          />
                        )}
                    </ActionsCell>
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
