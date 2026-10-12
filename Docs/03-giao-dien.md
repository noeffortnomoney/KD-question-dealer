# 03 — Giao diện (UI Inventory, mockup, design system)

## 1. Danh sách giao diện

Loại: **Page** (có URL), **Modal** (popup), **Drawer** (panel trượt), **State** (trạng thái giao diện). Mục "Page hoặc Modal" phải chốt bằng wireframe trước khi code. Cột "Mockup" trỏ tới khu vực đánh số trong Phụ lục A.

### Đại lý

| ID | Tên | Loại | Route đề xuất | Mockup | Thành phần / hành vi |
|---|---|---|---|---|---|
| UI-01 | Đăng nhập | Page | `/login` | ① | Email/mã đại lý + mật khẩu, "Ghi nhớ đăng nhập", "Quên mật khẩu". Lỗi không tiết lộ tài khoản có tồn tại |
| UI-02 | Dashboard đại lý | Page | `/` | ② | Banner, 3 thẻ số (khóa đang mở / lịch sắp tới / kỳ thi chưa hoàn thành), lịch training sắp tới, kỳ thi của bạn, kết quả gần nhất |
| — | Danh sách khóa học | Page | `/courses` | ④ | Tìm kiếm, tab lọc Tất cả / Đang mở / Sắp diễn ra / Đã hoàn thành, thẻ khóa học có % tiến độ, nút Tiếp tục / Học ngay / Xem chi tiết |
| UI-03 | Chi tiết khóa học | Page | `/courses/:courseId` | — | Mô tả, tài liệu, tiến độ, lịch training, nút tham gia Meet |
| — | Lịch training | Page | `/training-sessions` | ⑤ | Tab Tất cả / Sắp diễn ra / Đã diễn ra; nút "Tham gia" chỉ bật trong khung giờ cho phép |
| UI-04 | Ôn tập | Page | `/practice`, `/practice/:sessionId` | ⑥ | Chọn chủ đề, trả lời, xem giải thích, lịch sử; lưới câu hỏi bên phải |
| UI-05 | Hướng dẫn trước thi | Page (bước trong luồng thi) | `/exams/:examId` | — | Tên kỳ thi, 30 câu, 45 phút, điểm đạt, quy định, cảnh báo thời gian, nút Bắt đầu |
| UI-06 | Làm bài thi | Page | `/attempts/:attemptId` | ⑦ | Câu hỏi, lựa chọn, lưới điều hướng, đánh dấu, countdown server, trạng thái autosave, Nộp bài |
| UI-07 | Xác nhận nộp bài | Modal | trên UI-06 | ⑧ | "Bạn đã trả lời x/30 câu", Hủy / Nộp bài. Bấm lại không tạo attempt mới |
| UI-08 | Kết quả thi | Page | `/attempts/:attemptId/result` | ⑨ | Điểm, Đạt/Không đạt, thời gian làm, thời điểm nộp; đáp án chỉ khi policy cho phép |
| — | Kết quả của tôi | Page | `/my-results` | menu ②④ | Lịch sử các lượt thi |

### Quản trị viên

| ID | Tên | Loại | Route đề xuất | Mockup | Thành phần / hành vi |
|---|---|---|---|---|---|
| UI-09 | Dashboard quản trị | Page | `/admin` | ③ | KPI (tổng đại lý, khóa học, kỳ thi, tỷ lệ đạt), donut tình trạng tham gia, line chart điểm TB, bảng kỳ thi gần đây, cảnh báo |
| UI-10 | Quản lý đại lý | Page | `/admin/dealers` | — | Danh sách, tìm, lọc, phân trang, khóa/mở, import/export |
| UI-11 | Thêm / sửa đại lý | Modal | trên UI-10 | ⑩ | Form, validate theo trường, xác nhận khi lưu |
| UI-12 | Import Excel/CSV | Modal nhiều bước hoặc Page | `/admin/dealers/import` | — | Chọn file → preview → tổng hợp hợp lệ/lỗi → tải file lỗi → xác nhận |
| UI-13 | Quản lý khóa học | Page | `/admin/courses` | — | Danh sách, tìm, trạng thái xuất bản |
| UI-14 | Tạo / sửa khóa học | Page (nhiều tab) | `/admin/courses/:id` | — | Thông tin, tài liệu, lịch training, link Meet, phân công đại lý |
| UI-15 | Lịch training | Tab trong UI-14 | `/admin/courses/:id/sessions` | — | Tạo/sửa lịch, link Meet, trạng thái, điểm danh |
| UI-16 | Ngân hàng câu hỏi | Page | `/admin/questions` | — | Lọc chủ đề / độ khó / trạng thái |
| UI-17 | Tạo / sửa câu hỏi | Page hoặc Modal | `/admin/questions/:id` | — | Nội dung, loại, lựa chọn, đáp án đúng, giải thích, chủ đề, trạng thái |
| UI-18 | Quản lý kỳ thi | Page | `/admin/exams` | — | Danh sách, lịch mở/đóng, trạng thái, số câu, thời lượng, nhóm giao |
| UI-19 | Tạo / cấu hình kỳ thi | Page | `/admin/exams/:id` | — | 30 câu / 45 phút, điểm đạt, lịch, random, phân công, chính sách công bố |
| UI-20 | Kết quả & báo cáo | Page | `/admin/reports` | — | Lọc theo kỳ thi / đại lý / khu vực / trạng thái, export |
| UI-21 | Chi tiết lượt thi | Drawer | trên UI-20 | — | Thời gian, điểm, trạng thái, từng câu trả lời; thao tác theo quyền |
| UI-22 | Cấp lại lượt thi | Modal | trên UI-21 | — | Bắt buộc lý do, hiện thông tin lượt hiện tại, xác nhận |
| UI-23 | Audit log | Page | `/admin/audit-logs` | — | Tìm theo thao tác, người, thời gian, đối tượng |
| UI-24 | Xác nhận thao tác nguy hiểm | Modal | dùng chung | — | Nêu đối tượng và hậu quả |

### Dùng chung

| ID | Tên | Loại | Ghi chú |
|---|---|---|---|
| UI-25 | Loading / Empty / Error / Success / Offline | State | Áp dụng cho mọi Page, Modal, Drawer có gọi API. Lỗi phải có nút "Thử lại". Offline đặc biệt quan trọng trên UI-06 |

## 2. Điều hướng (theo mockup)

**Đại lý** (sidebar trái): Trang chủ · Khóa đào tạo · Lịch training · Luyện tập · Kỳ thi · Kết quả của tôi · Tài liệu

**Quản trị viên**: Trang chủ · Quản lý đại lý · Khóa đào tạo · Lịch training · Ngân hàng câu hỏi · Kỳ thi · Kết quả thi · Báo cáo · Cài đặt

Header: logo Kymdan, chuông thông báo, avatar + tên + đơn vị (dealer) / vai trò (admin).

Mobile: sidebar thu thành drawer (hamburger). Màn hình thi trên mobile: lưới câu hỏi chuyển thành bottom sheet.

## 3. Các vấn đề phát hiện trong mockup

Mockup là định hướng thị giác, nhưng các điểm sau **phải sửa ở wireframe** vì mâu thuẫn với spec hoặc thiếu hành vi bắt buộc:

| # | Khu vực | Vấn đề | Đề xuất |
|---|---|---|---|
| 1 | ⑦ Làm bài thi | Không có chỉ báo autosave (EX-06 bắt buộc) | Thêm "Đã lưu lúc hh:mm:ss" / "Đang lưu…" / "Chưa lưu — thử lại" cạnh đồng hồ |
| 2 | ⑦ Làm bài thi | Không có trạng thái mất kết nối | Banner cố định khi offline; không cho đóng |
| 3 | ⑥ ⑦ Lưới câu hỏi | Số thứ tự câu bị lặp/sai (1,2,3,7,6 / 2,5,6,7,9…) | Lưới đúng 1→30, 6 cột × 5 hàng |
| 4 | ⑦ Nút "Đánh dấu" | Tính năng đánh dấu câu không có trong spec/schema | `CẦN CHỐT`: lưu ở client (`sessionStorage`) là đủ, hoặc thêm cột `IsFlagged` |
| 5 | ⑦ Đồng hồ | Cần đổi màu khi còn < 5 phút và cảnh báo khi còn 1 phút | Vàng < 5 phút, đỏ < 1 phút |
| 6 | ③ Menu admin | Thiếu "Audit log" (UI-23); có "Cài đặt" không có trong spec | Thêm Audit log; "Cài đặt" `CẦN CHỐT` nội dung (đề xuất: hồ sơ admin, đổi mật khẩu, quản lý admin khác) |
| 7 | ② vs ④ | Menu dealer không nhất quán (② có "Tài liệu", ④ không) | Chốt một menu duy nhất |
| 8 | ⑩ Thêm đại lý | Admin nhập mật khẩu cho dealer | Đề xuất: sinh mật khẩu tạm / link kích hoạt, bắt đổi mật khẩu lần đầu. Không hiển thị lại mật khẩu |
| 9 | ⑩ Thêm đại lý | Form trộn thông tin **Đại lý** (công ty: Tên đại lý, SĐT) và **Người dùng** (Họ tên, email đăng nhập); có 2 trường email | Tách nhóm "Thông tin đại lý" và "Tài khoản đăng nhập"; thêm **Mã đại lý** (bắt buộc, unique) và **Khu vực** — đang thiếu |
| 10 | ⑩ Thêm đại lý | Trạng thái hiển thị "Active" tiếng Anh | Dùng "Hoạt động" / "Đã khóa" |
| 11 | ① Đăng nhập | Nhãn "Tên đăng nhập (Email)" | Phụ thuộc quyết định đăng nhập bằng email hay mã đại lý (`CẦN CHỐT`) |
| 12 | ⑨ Kết quả | Nút "Xem chi tiết" | Chỉ hiện khi `ShowAnswerPolicy` cho phép; nếu chưa, hiện "Đáp án sẽ công bố sau ngày …" |
| 13 | ② Dashboard | Kỳ thi "Chưa làm" + "Vào thi" | Nút phải đổi theo trạng thái: Vào thi / Tiếp tục làm (đang dở) / Xem kết quả / Chưa mở / Đã đóng |
| 14 | ⑤ Lịch training | Nút "Tham gia" | Chỉ bật từ X phút trước giờ bắt đầu đến giờ kết thúc (`CẦN CHỐT` X, đề xuất 15 phút); mở link Meet ở tab mới |

## 4. Trạng thái nút "Kỳ thi" phía đại lý

| Điều kiện | Nhãn | Hành động |
|---|---|---|
| `now < StartsAtUtc` | Chưa mở (mở lúc …) | disabled |
| Mở, chưa có attempt | Vào thi | → UI-05 |
| Có attempt `InProgress` còn hạn | Tiếp tục làm bài (còn mm:ss) | → UI-06 cùng attemptId |
| Attempt `Submitted`/`Expired` | Xem kết quả | → UI-08 |
| Attempt `Voided` (được cấp lại) | Thi lại | → UI-05 |
| `now > EndsAtUtc`, chưa thi | Đã đóng | disabled |

## 5. Design token (trích từ mockup — `CẦN CHỐT` với bộ nhận diện Kymdan chính thức)

| Token | Giá trị tạm | Dùng cho |
|---|---|---|
| `--color-primary` | `#D7141A` (đỏ Kymdan, ước lượng từ ảnh) | Nút chính, menu active, badge, điểm nhấn |
| `--color-primary-hover` | `#B51016` | Hover nút chính |
| `--color-primary-soft` | `#FDECEC` | Nền badge "Đang mở", nền menu active nhạt |
| `--color-success` | `#22A55B` | Đạt, đã trả lời, chỉ số tăng |
| `--color-warning` | `#F59E0B` | Chưa làm, cảnh báo thời gian |
| `--color-text` | `#1F2937` | Chữ chính |
| `--color-text-muted` | `#6B7280` | Chữ phụ |
| `--color-border` | `#E5E7EB` | Viền thẻ, input |
| `--color-bg` | `#F7F7F8` | Nền trang |
| `--color-surface` | `#FFFFFF` | Thẻ, modal |
| `--radius-card` | `12px` | Thẻ |
| `--radius-control` | `8px` | Nút, input |
| Font | Sans-serif hỗ trợ tiếng Việt đầy đủ (Be Vietnam Pro / Inter) | Toàn hệ thống |

Phong cách: premium, nhiều khoảng trắng, ảnh sản phẩm nệm/phòng ngủ ở banner và thẻ khóa học, icon line đơn sắc.

Khả năng tiếp cận: chữ trắng trên nền đỏ `#D7141A` đạt tương phản ≥ 4,5:1; radio/checkbox phải dùng được bằng bàn phím (phím số 1–4 chọn đáp án, ← → chuyển câu là tiện ích nên có trên UI-06).

## 6. Yêu cầu riêng cho màn hình thi (UI-06)

- Hiển thị 1 câu / màn hình; lưới 30 ô với 3 trạng thái: đã trả lời (xanh), chưa trả lời (xám), đang xem (đỏ), cộng cờ đánh dấu.
- Countdown: `remaining = deadlineAtUtc − (Date.now() + serverOffset)`; `serverOffset` tính từ `serverNowUtc` mỗi lần gọi API. Khi về 0 → khóa input, gọi submit, chuyển UI-08.
- F5 / đóng tab / đổi thiết bị → mở lại cùng attemptId, nạp đáp án đã lưu từ server.
- Cảnh báo `beforeunload` khi còn đáp án chưa lưu.
- Không render đáp án đúng; không có thông tin đúng/sai trong DOM hoặc network.

## 7. Bổ sung sau khi hiện thực (2026-10-12)

### 7.1 Chuông thông báo (UI-26)

| Hạng mục | Mô tả |
|---|---|
| Vị trí | Header, bên trái avatar + tên, có ở mọi trang của cả 2 vai trò. **Không** hiển thị trong phòng thi (`/attempts/*`) để thí sinh không bị phân tâm |
| Huy hiệu | Số thông báo chưa đọc (tối đa hiển thị `99+`) trên nền đỏ thương hiệu |
| Bảng thông báo (Popover) | 15 mục mới nhất: icon theo loại, tiêu đề (in đậm nếu chưa đọc), mô tả ngắn, thời gian tương đối ("5 phút trước"), chấm đỏ = chưa đọc. Nút "Đánh dấu tất cả đã đọc", link "Xem tất cả" |
| Bấm một thông báo | Đánh dấu đã đọc → đóng bảng → chuyển tới trang liên quan |
| Cập nhật | Khi mở trang / đổi trang / quay lại tab / mở bảng, và mỗi 60 giây khi tab đang hiển thị |
| Trang `/notifications` | Danh sách đầy đủ có phân trang, dùng chung cho 2 vai trò, nút "Đánh dấu tất cả đã đọc" |
| Trạng thái rỗng | "Chưa có thông báo nào" |

**Loại thông báo của Đại lý**

| Loại | Khi nào | Mở tới |
|---|---|---|
| Khóa học mới | Khóa học được xuất bản, hoặc đại lý được giao khóa đã xuất bản | `/courses/{id}` |
| Lịch training mới / thay đổi / bị hủy / được khôi phục | Admin thao tác trên buổi của khóa đã xuất bản | `/training-sessions` |
| Kỳ thi mới | Kỳ thi được mở, hoặc đại lý được giao kỳ thi đang mở | `/exams/{id}` |
| Đã có kết quả / đã công bố đáp án | Admin đóng kỳ thi có chính sách "sau khi kỳ thi kết thúc" (chỉ gửi người đã thi) | `/attempts/{id}/result` |
| Được cấp lại lượt thi | Admin cấp lại lượt | `/exams/{id}` |
| ⏰ Buổi training sắp bắt đầu / đang diễn ra | Trong 60 phút tới hoặc đang họp, đại lý **chưa** bấm tham gia | `/training-sessions` |
| ⏰ Kỳ thi sắp đóng | Còn ≤ 24 giờ, đại lý chưa làm bài | `/exams/{id}` |
| ⏰ Bạn đang làm dở | Có lượt thi `InProgress` còn hạn | `/attempts/{id}` |

**Loại thông báo của Quản trị viên**

| Loại | Khi nào | Mở tới |
|---|---|---|
| ⏰ Buổi training sắp bắt đầu / đang diễn ra | Buổi của khóa đã xuất bản trong 60 phút tới hoặc đang họp | Trang điểm danh của buổi |
| ⚠️ Kỳ thi đã hết hạn | Kỳ thi `published` có giờ đóng đã qua → nhắc đóng để công bố đáp án | `/admin/exams/{id}` |
| ⚠️ Kỳ thi thiếu câu hỏi | Kỳ thi đang mở không đủ câu đã xuất bản | Tab Bộ câu hỏi |
| ⚠️ Lượt thi quá hạn chưa đóng | Có lượt `InProgress` quá hạn > 2 phút (cron không chạy) | `/admin` |

Mỗi thông báo chỉ gửi **một lần** cho mỗi người (khóa `dedupeKey`), kể cả khi admin bấm lại thao tác hoặc nhắc việc được tính lại.

### 7.2 Điểm danh buổi training — `/admin/training-sessions/{sessionId}`

Mở từ cột "x/y · Điểm danh" ở tab Lịch training của khóa học hoặc trang Lịch training của admin. Gồm: 3 thẻ số (được giao / đã bấm tham gia + tỷ lệ / chưa tham gia), lọc Tất cả / Đã tham gia / Chưa tham gia, tìm theo mã/tên/email, bảng có giờ bấm tham gia, nút "Mở Google Meet", "Xuất Excel". Khi buổi đang diễn ra trang tự cập nhật mỗi 30 giây. "Đã tham gia" = đã bấm nút Tham gia trong app (Google Meet miễn phí không cho dữ liệu ai ở lại bao lâu — xem Docs/09 §6).

### 7.3 Trạng thái lịch training theo giờ thực

Nhãn tính theo thời điểm hiện tại, không lấy thẳng cột `status` trong DB: **Sắp diễn ra** → **Đang diễn ra** → **Đã diễn ra**, hoặc **Đã hủy**. Phía đại lý: nút "Tham gia" là link mở thẳng Google Meet (tab mới), chỉ xuất hiện từ 15 phút trước giờ bắt đầu đến hết giờ; trước đó là nút xám "Chưa đến giờ".

### 7.4 Banner "Đại lý chưa nhìn thấy"

Trang khóa học / kỳ thi ở trạng thái bản nháp (hoặc khóa học lưu trữ) có banner vàng nêu lý do đại lý chưa thấy và nút "Xuất bản ngay". Thông báo sau khi giao đại lý / thêm lịch cho nội dung bản nháp cũng nhắc "đại lý chỉ thấy sau khi bạn bấm Xuất bản".

### 7.5 Xếp hạng (UI-27)

| Màn hình | Nội dung |
|---|---|
| Admin — tab **Xếp hạng** ở `/admin/exams/{id}?tab=ranking` (cũng mở từ nút "Bảng xếp hạng" ở trang Kết quả & báo cáo) | Nhãn "Kết quả chính thức" / "Xếp hạng tạm thời", 4 thẻ số (đã có điểm, điểm cao nhất, điểm TB, tỷ lệ đạt), lọc theo khu vực (xếp hạng lại trong khu vực) + tìm kiếm, bảng: hạng (huy chương top 3), mã, đại lý, khu vực, điểm, số câu đúng, thời gian làm, nộp lúc, kết quả; nút Xuất Excel |
| Admin — form cấu hình kỳ thi | Ô chọn "Công khai bảng xếp hạng cho đại lý" (mặc định tắt) |
| Đại lý — `/exams/{examId}/ranking` | Thẻ lớn "Hạng của bạn x/y", top %, hạng trong khu vực, điểm, thời gian làm, điểm TB chung; bảng Top 10 (dòng của mình được tô) nếu kỳ thi công khai, nếu không thì dòng thông báo "không được công khai". Chưa kết thúc / không công bố điểm / không thi → trang trạng thái rỗng giải thích lý do |
| Đại lý — lối vào | Nút "Xếp hạng" ở thẻ kỳ thi trong `/exams` (chỉ hiện khi đã có xếp hạng); nút "Xem xếp hạng" ở trang kết quả bài thi |

### 7.6 Import câu hỏi từ Excel/CSV (UI-28) — `/admin/questions/import`

Mở từ nút "Import Excel/CSV" ở trang Ngân hàng câu hỏi. 3 bước như import đại lý:

1. **Chọn file:** nút "Tải file mẫu" (`mau-import-cau-hoi.xlsx`, sheet "Cau hoi" có 2 dòng ví dụ + sheet "Huong dan" giải thích từng cột và liệt kê chủ đề hiện có).
2. **Xem trước:** 3 thẻ số (tổng / hợp lệ / có lỗi), thông báo chủ đề sẽ được tạo mới, bảng từng dòng (chủ đề + nhãn "mới", câu hỏi và các lựa chọn, đáp án đúng, kết quả kiểm tra), lọc "Chỉ hiện dòng lỗi", "Tải file dòng lỗi" (CSV), ô chọn "Xuất bản ngay sau khi import" (mặc định tắt → bản nháp), nút "Xác nhận import". Chưa có gì được lưu trước khi xác nhận.
3. **Hoàn tất:** số câu đã import, trạng thái (đã xuất bản / bản nháp), chủ đề mới, link về ngân hàng câu hỏi.

| Cột file mẫu | Bắt buộc | Quy tắc |
|---|---|---|
| Chủ đề | ✔ | Khớp chủ đề có sẵn không phân biệt hoa thường/dấu; chưa có → tạo mới |
| Nội dung câu hỏi | ✔ | 5–4000 ký tự; không trùng câu chưa lưu trữ trong cùng chủ đề, không trùng dòng khác trong file |
| Đáp án A, B | ✔ | |
| Đáp án C–F | | Điền liên tục, không bỏ trống ô ở giữa; không có 2 lựa chọn giống nhau |
| Đáp án đúng | ✔ | A–F (hoặc 1–6), phải trỏ vào ô có nội dung |
| Giải thích | | ≤ 4000 ký tự |
| Độ khó | | Dễ / Trung bình / Khó (có hoặc không dấu), trống = Trung bình |

Giới hạn: `.xlsx` hoặc `.csv` UTF-8, ≤ 5 MB, ≤ 2.000 câu/lần.

### 7.7 Phân trang bảng (áp dụng mọi bảng — 2026-10-12)

| Hạng mục | Quy tắc |
|---|---|
| Mặc định | **10 dòng / trang** |
| Chọn số dòng | Dropdown "Số dòng": 10 / 20 / 50 / 100 (giá trị khác trên URL → về 10) |
| Thanh phân trang | "Hiển thị a–b / tổng", dropdown số dòng, nút trang đầu / trước / các số trang (có "…" khi nhiều trang) / sau / cuối. Chỉ 1 trang thì ẩn cụm nút |
| URL | Tham số `page` và `size` (giữ nguyên bộ lọc, tab đang mở). Đổi số dòng → về trang 1. Trang vượt quá → hiển thị trang cuối |
| Bảng xem trước import | Phân trang ngay trên trình duyệt (không đổi URL); bật "Chỉ hiện dòng lỗi" hoặc tải file mới → về trang 1 |
| Áp dụng | Đại lý, Câu hỏi, Kỳ thi (+ tab Bộ câu hỏi, Phân công, Xếp hạng), Khóa học (+ tab Lịch training, Đại lý & tiến độ), Lịch training, Điểm danh, Kết quả & báo cáo, Audit log, Cài đặt (quản trị viên), Thông báo, Kết quả của tôi, Lịch sử luyện tập, xem trước import đại lý / câu hỏi |
| Không áp dụng | Bảng tóm tắt cố định: "Kỳ thi gần đây" (6 dòng) ở tổng quan admin, "Top 10" ở trang xếp hạng đại lý |

File Excel/CSV xuất ra luôn chứa **toàn bộ** dữ liệu theo bộ lọc, không bị cắt theo trang.
