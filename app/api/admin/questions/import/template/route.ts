import { requireAdmin } from "@/lib/auth-guard";
import { guardResponse } from "@/lib/http";
import { XLSX_TYPE, buildWorkbook, fileResponse } from "@/lib/import/excel";
import { QUESTION_COLUMNS } from "@/lib/import/question-import";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);

  const categories = await prisma.questionCategory.findMany({
    where: { status: "active" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
  const sampleCategory = categories[0]?.name ?? "Kiến thức sản phẩm";

  const buffer = await buildWorkbook([
    {
      name: "Cau hoi",
      columns: QUESTION_COLUMNS.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.key === "stem" || c.key === "explanation" ? 50 : c.key === "category" ? 26 : c.key.startsWith("opt") ? 28 : 14,
      })),
      rows: [
        {
          category: sampleCategory,
          stem: "Ưu điểm nổi bật của nệm cao su thiên nhiên là gì?",
          optA: "Độ đàn hồi cao và bền bỉ",
          optB: "Trọng lượng nhẹ, dễ gấp gọn",
          optC: "Giá thành thấp nhất thị trường",
          optD: "Chỉ phù hợp với khí hậu lạnh",
          correct: "A",
          explanation: "Cao su thiên nhiên có độ đàn hồi cao, nâng đỡ tốt và giữ form lâu.",
          difficulty: "Dễ",
        },
        {
          category: sampleCategory,
          stem: "Khi khách chê giá cao, cách phản hồi phù hợp là?",
          optA: "Giảm giá ngay lập tức",
          optB: "Giải thích giá trị sử dụng lâu dài",
          correct: "B",
          explanation: "",
          difficulty: "Trung bình",
        },
      ],
    },
    {
      name: "Huong dan",
      columns: [
        { header: "Cột", key: "col", width: 22 },
        { header: "Bắt buộc", key: "req", width: 10 },
        { header: "Cách điền", key: "note", width: 90 },
      ],
      rows: [
        ...QUESTION_COLUMNS.map((c) => ({
          col: c.header,
          req: c.required ? "Có" : "Không",
          note: {
            category: "Tên chủ đề. Khớp với chủ đề có sẵn (không phân biệt hoa thường, có dấu hay không). Chưa có thì hệ thống tự tạo chủ đề mới.",
            stem: "Nội dung câu hỏi, 5–4000 ký tự. Không được trùng câu đã có trong cùng chủ đề.",
            optA: "Lựa chọn A",
            optB: "Lựa chọn B (mỗi câu cần ít nhất A và B)",
            optC: "Không bắt buộc. Điền lần lượt, không bỏ trống ô ở giữa (vd có D thì phải có C).",
            optD: "Không bắt buộc",
            optE: "Không bắt buộc",
            optF: "Không bắt buộc (tối đa 6 lựa chọn)",
            correct: "Một chữ A, B, C, D, E hoặc F — đúng một đáp án đúng cho mỗi câu.",
            explanation: "Không bắt buộc. Hiển thị cho đại lý khi luyện tập và khi kỳ thi công bố đáp án.",
            difficulty: "Dễ / Trung bình / Khó. Để trống = Trung bình.",
          }[c.key],
        })),
        { col: "", req: "", note: "" },
        { col: "LƯU Ý", req: "", note: "Xóa 2 dòng ví dụ trong sheet \"Cau hoi\" trước khi điền câu hỏi của bạn." },
        { col: "Chủ đề hiện có", req: "", note: categories.map((c) => c.name).join("; ") || "(chưa có)" },
        { col: "Giới hạn", req: "", note: "Tối đa 2.000 câu, 5 MB mỗi file. Nhận .xlsx hoặc .csv (UTF-8)." },
      ],
    },
  ]);
  return fileResponse(buffer, "mau-import-cau-hoi.xlsx", XLSX_TYPE);
}
