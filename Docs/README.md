# Kymdan Dealer Training & Examination Portal — Bộ tài liệu phát triển

Bộ tài liệu này được chuẩn hóa từ gói bàn giao v1.1 (`Dealer_Training_Examination_Portal_Spec_v1_1`, `schema.sql`, `k6_exam_load_test.js`, `README_v1_1.txt`, mockup Phụ lục A). Mục tiêu: một nguồn tham chiếu duy nhất, đọc được theo từng module khi code.

## Thông số đã chốt

| Hạng mục | Giá trị |
|---|---|
| Đối tượng | Đại lý (dealer) |
| Vai trò | Đúng 2 vai trò: **Quản trị viên (Admin)** và **Đại lý (Dealer)** |
| Training online | Google Meet (giảng viên trình bày; đại lý xem, chat, hỏi đáp). Website chỉ lưu link |
| Đề thi chính thức | 30 câu, trắc nghiệm 1 đáp án |
| Thời gian thi | 45 phút, tính theo giờ server (UTC) |
| Số lượt thi chính thức | Tối đa 1 lượt hợp lệ / kỳ thi; admin cấp lại có lý do + audit |
| Ôn tập | Không giới hạn số lần |
| Tải mục tiêu | 1.000 người thi đồng thời |
| Tài khoản đại lý | Import từ Excel/CSV (có preview, báo lỗi theo dòng) |
| Nền tảng | Website responsive tự xây. **Stack theo project TrackMyGoal**: Next.js 15 + Prisma 6 + NextAuth v5 + shadcn/ui (không dùng ASP.NET Core như spec gợi ý). DB/hosting `CẦN CHỐT` — xem [10](10-cong-nghe.md) |
| Ngân sách | Chưa chốt; dự toán 125–221 triệu VNĐ |
| Thời gian | 12 tuần |

## Mục lục

| File | Nội dung | Dùng khi |
|---|---|---|
| [01-tong-quan-pham-vi.md](01-tong-quan-pham-vi.md) | Mục tiêu, phạm vi MVP, vai trò, luồng nghiệp vụ, kiến trúc đề xuất | Bắt đầu dự án, onboarding |
| [02-quy-tac-thi.md](02-quy-tac-thi.md) | Quy tắc EX-01…EX-12, vòng đời attempt, autosave, chấm điểm, cấp lại lượt | Code exam engine |
| [03-giao-dien.md](03-giao-dien.md) | UI-01…UI-28, đối chiếu mockup, điều hướng, design token, các thiếu sót của mockup; §7: chuông thông báo, trang điểm danh, trạng thái lịch theo giờ, banner bản nháp, xếp hạng, import câu hỏi, phân trang bảng | Code frontend, làm wireframe |
| [04-co-so-du-lieu.md](04-co-so-du-lieu.md) | Phân tích `schema.sql`, lỗ hổng so với spec, bảng còn thiếu, migration đề xuất | Viết migration / EF model |
| [05-api.md](05-api.md) | Danh sách endpoint, hợp đồng request/response, mã lỗi | Code backend + frontend |
| [06-bao-mat.md](06-bao-mat.md) | Auth, RBAC, chống lộ đáp án, rate limit, audit, dữ liệu cá nhân | Review bảo mật |
| [07-kiem-thu-tai.md](07-kiem-thu-tai.md) | Kế hoạch k6, lỗi trong script mẫu, script đã sửa, ước lượng tải | Tuần 10–11 |
| [08-ke-hoach-nghiem-thu.md](08-ke-hoach-nghiem-thu.md) | Lộ trình 12 tuần, ngân sách, tiêu chí nghiệm thu, Definition of Done | Lập kế hoạch sprint |
| [09-cau-hoi-mo-rui-ro.md](09-cau-hoi-mo-rui-ro.md) | Câu hỏi cần chủ dự án chốt, mâu thuẫn trong tài liệu gốc, rủi ro | Workshop tuần 1–2 |
| [10-cong-nghe.md](10-cong-nghe.md) | Stack (theo TrackMyGoal), cấu trúc thư mục, auth/guard, Server Action vs Route Handler, exam engine với Prisma, DB/hosting | Dựng skeleton, code mọi module |
| [11-kich-ban-demo.md](11-kich-ban-demo.md) | Kịch bản demo ~25 phút cho lãnh đạo không chuyên IT: chuẩn bị, lời nói từng bước (đại lý → quản trị), câu hỏi xin quyết, câu hỏi thường gặp, xử lý sự cố | Trước buổi demo |

## Nguyên tắc đọc

- Khi tài liệu gốc mâu thuẫn nhau, bộ tài liệu này ghi rõ chỗ mâu thuẫn và **đề xuất** cách xử lý, đánh dấu `ĐỀ XUẤT`. Mục đánh dấu `CẦN CHỐT` phải được chủ dự án xác nhận trước khi code phần liên quan.
- Mọi thời gian lưu UTC; hiển thị theo `Asia/Ho_Chi_Minh` (UTC+7).
- Số liệu, tên khóa học, ngày tháng trong mockup là dữ liệu minh họa, không phải dữ liệu thật.
