import { requireAdmin } from "@/lib/auth-guard";
import { guardResponse } from "@/lib/http";
import { TEMPLATE_COLUMNS } from "@/lib/import/dealer-import";
import { XLSX_TYPE, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { DEFAULT_PASSWORD } from "@/lib/password-rules";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);

  const buffer = await buildWorkbook([
    {
      name: "Dai ly",
      columns: TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: 24 })),
      rows: [
        {
          code: "HCM001",
          dealerName: "Đại lý Nệm Kymdan Quận 1",
          userName: "Nguyễn Văn A",
          email: "hcm001@example.com",
          phone: "0909123456",
          region: "TP. Hồ Chí Minh",
        },
      ],
    },
    {
      name: "Huong dan",
      columns: [
        { header: "Cột", key: "col", width: 24 },
        { header: "Bắt buộc", key: "req", width: 12 },
        { header: "Ghi chú", key: "note", width: 70 },
      ],
      rows: TEMPLATE_COLUMNS.map((c) => ({
        col: c.header,
        req: c.required ? "Có" : "Không",
        note:
          c.key === "code"
            ? "Duy nhất, chỉ gồm chữ, số, dấu - _ ."
            : c.key === "email"
              ? `Duy nhất, dùng để đăng nhập. Mật khẩu đăng nhập lần đầu: ${DEFAULT_PASSWORD} (bắt buộc đổi ngay)`
              : `Tối đa ${c.max} ký tự`,
      })),
    },
  ]);
  return fileResponse(buffer, "mau-import-dai-ly.xlsx", XLSX_TYPE);
}
