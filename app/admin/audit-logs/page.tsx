import type { Prisma } from "@prisma/client";
import { EmptyState } from "@/components/common/EmptyState";
import { FilterBar } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { clampPage, parsePage, parsePageSize } from "@/lib/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log — Kymdan" };

const ACTION_LABEL: Record<string, string> = {
  "Attempt.Reissue": "Cấp lại lượt thi",
  "Dealer.Import": "Import đại lý",
  "Dealer.Create": "Thêm đại lý",
  "Dealer.Update": "Sửa đại lý",
  "Dealer.Lock": "Khóa đại lý",
  "Dealer.Unlock": "Mở khóa đại lý",
  "User.ResetPassword": "Cấp lại mật khẩu",
  "User.ChangePassword": "Đổi mật khẩu",
  "User.CreateAdmin": "Tạo quản trị viên",
  "User.Lock": "Khóa tài khoản",
  "User.Unlock": "Mở khóa tài khoản",
  "Question.Create": "Tạo câu hỏi",
  "Question.Update": "Sửa câu hỏi",
  "Question.Publish": "Xuất bản câu hỏi",
  "Question.Unpublish": "Ngừng xuất bản câu hỏi",
  "Question.Archive": "Lưu trữ câu hỏi",
  "Exam.Create": "Tạo kỳ thi",
  "Exam.Update": "Sửa kỳ thi",
  "Exam.Publish": "Mở kỳ thi",
  "Exam.Close": "Đóng kỳ thi",
  "Exam.Archive": "Lưu trữ kỳ thi",
  "Exam.Delete": "Xóa kỳ thi",
  "Exam.Assign": "Giao kỳ thi",
  "Exam.Unassign": "Bỏ giao kỳ thi",
  "Exam.AddQuestions": "Thêm câu vào đề",
  "Exam.RemoveQuestion": "Gỡ câu khỏi đề",
  "Question.Import": "Import câu hỏi",
  "Course.Create": "Tạo khóa học",
  "Course.Update": "Sửa khóa học",
  "Course.published": "Xuất bản khóa học",
  "Course.draft": "Ngừng xuất bản khóa học",
  "Course.archived": "Lưu trữ khóa học",
  "Course.AddMaterial": "Thêm tài liệu",
  "Course.MaterialUpload": "Tải lên tài liệu",
  "Course.DeleteMaterial": "Xóa tài liệu",
  "Course.Enroll": "Giao khóa học",
  "Course.Unenroll": "Bỏ giao khóa học",
  "Session.Create": "Thêm buổi training",
  "Session.Update": "Sửa buổi training",
  "Session.cancelled": "Hủy buổi training",
  "Session.scheduled": "Khôi phục buổi training",
};

type SP = { q?: string; entity?: string; from?: string; to?: string; page?: string; size?: string };

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const size = parsePageSize(sp.size);
  const from = sp.from ? new Date(`${sp.from}T00:00:00+07:00`) : null;
  const to = sp.to ? new Date(`${sp.to}T23:59:59+07:00`) : null;
  const q = sp.q?.trim();

  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entity ? { entityType: sp.entity } : {}),
    ...(from || to ? { occurredAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q } },
            { entityId: { contains: q } },
            { details: { contains: q } },
            { actor: { email: { contains: q } } },
          ],
        }
      : {}),
  };

  const total = await prisma.auditLog.count({ where });
  const page = clampPage(parsePage(sp.page), total, size);
  const [logs, entities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * size,
      take: size,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        occurredAt: true,
        details: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);

  return (
    <div>
      <PageHeader title="Audit log" description="Nhật ký các thao tác quan trọng, chỉ được ghi thêm, không sửa/xóa" />
      <form method="get" className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          Từ <input type="date" name="from" defaultValue={sp.from} className="h-9 rounded-md border bg-card px-2" />
        </label>
        <label className="flex items-center gap-1">
          Đến <input type="date" name="to" defaultValue={sp.to} className="h-9 rounded-md border bg-card px-2" />
        </label>
        {sp.q && <input type="hidden" name="q" value={sp.q} />}
        {sp.entity && <input type="hidden" name="entity" value={sp.entity} />}
        <button type="submit" className="h-9 rounded-md border bg-card px-3 hover:bg-muted">
          Áp dụng ngày
        </button>
      </form>
      <FilterBar
        basePath="/admin/audit-logs"
        q={sp.q}
        placeholder="Tìm theo thao tác, email người thực hiện, ID, nội dung…"
        hidden={{ from: sp.from, to: sp.to }}
        selects={[
          {
            name: "entity",
            label: "Mọi đối tượng",
            value: sp.entity,
            options: entities.map((e) => ({ value: e.entityType, label: e.entityType })),
          },
        ]}
      />
      {logs.length === 0 ? (
        <EmptyState title="Không có bản ghi" />
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Thao tác</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead className="w-[40%]">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{formatDateTime(l.occurredAt)}</TableCell>
                  <TableCell>
                    <div className="text-sm">{l.actor?.name ?? "Hệ thống"}</div>
                    <div className="text-xs text-muted-foreground">{l.actor?.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{ACTION_LABEL[l.action] ?? l.action}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{l.action}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {l.entityType}
                    <div className="font-mono text-[11px] text-muted-foreground">{l.entityId}</div>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    {l.details ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-brand">Xem</summary>
                        <pre className="mt-1 max-h-60 overflow-auto rounded bg-muted p-2 text-[11px]">
                          {JSON.stringify(JSON.parse(l.details), null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pageSize={size} total={total} className="border-t" />
        </div>
      )}
    </div>
  );
}
