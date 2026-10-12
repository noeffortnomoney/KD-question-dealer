import { requireAdmin } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/date-utils";
import { apiError, guardResponse } from "@/lib/http";
import { XLSX_TYPE, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { getSessionAttendance, type AttendanceFilter } from "@/lib/queries/attendance";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const { sessionId } = await params;
  const url = new URL(request.url);
  const f = url.searchParams.get("filter");
  const filter: AttendanceFilter = f === "joined" || f === "missing" ? f : "all";
  const data = await getSessionAttendance(sessionId, filter, url.searchParams.get("q") ?? "");
  if (!data) return apiError(404, "NOT_FOUND", "Không tìm thấy buổi training");

  const buffer = await buildWorkbook([
    {
      name: "Diem danh",
      columns: [
        { header: "STT", key: "no", width: 6 },
        { header: "Mã đại lý", key: "code", width: 14 },
        { header: "Tên đại lý", key: "name", width: 32 },
        { header: "Người dùng", key: "userName", width: 24 },
        { header: "Email", key: "email", width: 28 },
        { header: "Khu vực", key: "region", width: 18 },
        { header: "Trạng thái", key: "status", width: 16 },
        { header: "Bấm tham gia lúc", key: "joinedAt", width: 20 },
      ],
      rows: data.rows.map((r, i) => ({
        no: i + 1,
        code: r.code,
        name: r.name,
        userName: r.userName ?? "",
        email: r.email ?? "",
        region: r.region ?? "",
        status: r.joinedAt ? "Đã tham gia" : "Chưa tham gia",
        joinedAt: r.joinedAt ? formatDateTime(r.joinedAt) : "",
      })),
    },
  ]);
  const name = `diem-danh-${data.session.title}`.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 80);
  return fileResponse(buffer, `${name}.xlsx`, XLSX_TYPE);
}
