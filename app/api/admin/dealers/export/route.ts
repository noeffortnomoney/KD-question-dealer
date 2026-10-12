import { requireAdmin } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { guardResponse } from "@/lib/http";
import { XLSX_TYPE, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { dealerWhere } from "@/lib/queries/dealers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const url = new URL(request.url);
  const dealers = await prisma.dealer.findMany({
    where: dealerWhere({
      q: url.searchParams.get("q") ?? undefined,
      region: url.searchParams.get("region") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    }),
    orderBy: { code: "asc" },
    select: {
      code: true,
      name: true,
      phone: true,
      region: true,
      status: true,
      createdAt: true,
      users: { select: { name: true, email: true, lastLoginAt: true }, take: 1 },
    },
  });

  const buffer = await buildWorkbook([
    {
      name: "Dai ly",
      columns: [
        { header: "Mã đại lý", key: "code", width: 14 },
        { header: "Tên đại lý", key: "name", width: 32 },
        { header: "Người dùng", key: "userName", width: 24 },
        { header: "Email", key: "email", width: 28 },
        { header: "Số điện thoại", key: "phone", width: 16 },
        { header: "Khu vực", key: "region", width: 18 },
        { header: "Trạng thái", key: "status", width: 12 },
        { header: "Đăng nhập gần nhất", key: "lastLogin", width: 20 },
        { header: "Ngày tạo", key: "createdAt", width: 20 },
      ],
      rows: dealers.map((d) => ({
        code: d.code,
        name: d.name,
        userName: d.users[0]?.name ?? "",
        email: d.users[0]?.email ?? "",
        phone: d.phone ?? "",
        region: d.region ?? "",
        status: d.status === "active" ? "Hoạt động" : "Đã khóa",
        lastLogin: d.users[0]?.lastLoginAt ? formatDateTime(d.users[0].lastLoginAt) : "",
        createdAt: formatDateTime(d.createdAt),
      })),
    },
  ]);
  return fileResponse(buffer, "danh-sach-dai-ly.xlsx", XLSX_TYPE);
}
