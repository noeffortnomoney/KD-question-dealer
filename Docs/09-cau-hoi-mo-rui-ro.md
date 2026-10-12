# 09 — Câu hỏi mở, mâu thuẫn tài liệu, rủi ro

## 1. Câu hỏi cần chủ dự án chốt

Cột "Đề xuất" là phương án mặc định nếu không có phản hồi trước khi sprint 1 kết thúc.

### Từ spec mục 13

| # | Câu hỏi | Đề xuất | Ảnh hưởng |
|---|---|---|---|
| Q1 | Điểm đạt mặc định? | 70% | `Exams.PassMarkPercent` |
| Q2 | Loại câu hỏi MVP: 1 đáp án hay nhiều đáp án đúng? | Chỉ 1 đáp án | Schema `AttemptAnswers`, chấm điểm |
| Q3 | Kỳ thi mở trong khoảng ngày hay giờ bắt đầu cố định? | Khoảng ngày | Hình dạng tải (giờ cố định = spike lớn) |
| Q4 | Dealer đăng nhập bằng email/mật khẩu hay mã dealer? | Email + mật khẩu | UI-01, import, `Users.Email` |
| Q5 | Có phân nhóm theo tỉnh/khu vực/nhóm đại lý? | Có cột Khu vực; giao kỳ thi theo khu vực | `ExamAssignments`, báo cáo |
| Q6 | Kết quả và đáp án hiện ngay hay sau khi kỳ thi kết thúc? | Điểm ngay; đáp án sau khi kỳ thi đóng | `ShowScorePolicy`, `ShowAnswerPolicy` |
| Q7 | Có gửi email thông báo lịch học/kỳ thi? | Không ở MVP, chỉ email đặt lại mật khẩu | Cần SMTP/dịch vụ email |
| Q8 | Gói Google Workspace? Có lấy attendance tự động từ Meet? | Điểm danh thủ công ở MVP | `Attendance.Source` |

### Phát sinh khi phân tích

| # | Câu hỏi | Đề xuất | Xem |
|---|---|---|---|
| Q9 | 1 lượt thi tính theo **đại lý** hay theo **tài khoản**? Một đại lý có nhiều tài khoản không? | 1 đại lý = 1 tài khoản ở MVP; unique theo DealerId | [04 §2 #2](04-co-so-du-lieu.md#2-lỗ-hổng-so-với-spec) |
| Q10 | Bắt đầu thi sát giờ đóng: deadline = 45 phút hay cắt theo giờ đóng? | Cắt theo giờ đóng + cảnh báo trước | [02 §4](02-quy-tac-thi.md#4-deadline-và-lịch-kỳ-thi) |
| Q11 | Thời gian grace cho câu trả lời gửi ở giây cuối? | 5–10 giây | [02 §5](02-quy-tac-thi.md#5-autosave--put-apiattemptsattemptidanswersattemptquestionid) |
| Q12 | Cấp lại lượt có phân biệt lỗi hệ thống và lỗi thiết bị/mạng dealer? | Lưu `reasonCategory`, không đổi quy trình | [02 §9](02-quy-tac-thi.md#9-cấp-lại-lượt-ex-09-và-xử-lý-sự-cố-41) |
| Q13 | Tính năng "Đánh dấu câu" trong mockup có cần lưu server? | Chỉ lưu client | [03 §3](03-giao-dien.md#3-các-vấn-đề-phát-hiện-trong-mockup) |
| Q14 | Admin đặt mật khẩu cho dealer (mockup ⑩) hay gửi link kích hoạt? | Mật khẩu tạm + bắt đổi lần đầu | [06 §1](06-bao-mat.md#1-xác-thực) |
| Q15 | Import gặp mã dealer đã tồn tại: bỏ qua / cập nhật / báo lỗi? | Báo lỗi | [05](05-api.md) |
| Q16 | Câu hỏi đang dùng trong kỳ thi Official có được xuất hiện trong ôn tập? | Không | [06 §3](06-bao-mat.md#3-chống-lộ-đáp-án) |
| Q17 | Có nhiều tài khoản admin không? Admin quản lý admin khác ở đâu ("Cài đặt")? | Có; trang Cài đặt quản lý admin | [03 §3](03-giao-dien.md#3-các-vấn-đề-phát-hiện-trong-mockup) |
| Q18 | Nút "Tham gia" Meet bật từ bao nhiêu phút trước giờ học? | 15 phút | [03 §3](03-giao-dien.md#3-các-vấn-đề-phát-hiện-trong-mockup) |
| Q19 | Thế nào là "hoàn thành khóa học" (xem hết tài liệu bắt buộc? tham dự Meet?) | Hoàn thành mọi tài liệu `IsRequired` | `CourseEnrollments.CompletedAtUtc` |
| Q20 | Thời hạn lưu hồ sơ thi, log, file import | Xem bảng [06 §8](06-bao-mat.md#8-dữ-liệu-cá-nhân) | Job dọn dữ liệu |
| Q21 | Hosting + DB: Vercel Pro + Neon Postgres (như TrackMyGoal prod) hay tự host + SQL Server (như Internal_Order_App)? | `CẦN CHỐT` — so sánh ở [10 §6](10-cong-nghe.md#6-database-và-hosting--cần-chốt). Dù chọn gì, dev/staging/prod cùng một loại DB | Ngân sách vận hành, cú pháp SQL ở 04/07, nơi lưu file |

## 2. Mâu thuẫn và lỗi trong tài liệu gốc

| # | Vị trí | Mâu thuẫn | Xử lý trong bộ tài liệu này |
|---|---|---|---|
| D1 | Spec: header "ĐẶC TẢ V1.0", cuối "KẾT THÚC TÀI LIỆU — BẢN 1.0" | Nội dung là v1.1 | Coi là v1.1 |
| D2 | Bảng thông số vs EX-03 | "1 lượt / **tài khoản**" vs "unique (ExamId, **DealerId**)" | Q9 |
| D3 | Spec mục 6, bảng `TrainingSessions` | Cột "Quản trị viênUserId" — lỗi tìm-thay-thế từ "TrainerUserId" | Đổi thành `PresenterName` (không phải tài khoản) |
| D4 | `schema.sql` vs spec EX-03 / 6.1 | Spec đòi unique; schema chỉ có index thường | Bổ sung filtered unique index |
| D5 | `schema.sql` vs spec mục 6 | Thiếu `PasswordHash`, `ImportJobs`, `ImportErrors` | Bổ sung / dùng bảng của thư viện auth |
| D6 | API spec vs schema | Có `/api/practice/sessions` nhưng không có bảng ôn tập | Bổ sung `PracticeSessions`, `PracticeAnswers` |
| D7 | Spec mục 6 | "Schema dùng bigint identity" nhưng `ExamAttempts.AttemptId` là GUID | Giữ GUID cho attempt (khó đoán URL) |
| D8 | k6 script vs EX-08 | Dùng `testOptionId` ngụ ý API trả đáp án | Sửa script, chọn ngẫu nhiên |
| D9 | k6 script vs luật 1 lượt | Một tài khoản lặp lại nhiều iteration | Sửa script |
| D10 | Mockup vs EX-06 | Màn thi không có chỉ báo autosave/mất kết nối | Bổ sung ở wireframe |
| D11 | Mockup ②/④ | Menu dealer không nhất quán | Chốt 1 menu |
| D12 | Mockup ③ vs UI-23 | Menu admin thiếu Audit log | Bổ sung |
| D13 | Mockup ④ vs schema | Hiển thị % tiến độ khóa học nhưng không có bảng tiến độ | Bổ sung `MaterialProgress` |
| D14 | Spec mục 6 `ExamAssignments` | "DealerId hoặc DealerGroupId" nhưng schema chỉ có DealerId | Q5 |
| D15 | Spec 7.1 / k6 | Spec cho phép cookie hoặc bearer; k6 cứng Bearer | Stack dùng NextAuth cookie; script k6 đã sửa theo |
| D16 | Spec mục 6.1 / 8 | Spec gợi ý ASP.NET Core Identity + SQL Server | Quyết định của chủ dự án: dùng stack TrackMyGoal (Next.js + Prisma + NextAuth), xem [10](10-cong-nghe.md). Cần ghi nhận thay đổi này vào spec v1.2 |

## 3. Rủi ro

| # | Rủi ro | Khả năng | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|---|
| R1 | Race condition tạo 2 attempt | Trung bình | Cao (vi phạm luật thi, khiếu nại) | Filtered unique index + bắt lỗi duplicate key |
| R2 | Mất câu trả lời do mạng yếu ở cửa hàng | Cao | Cao | Retry + hàng đợi client + chỉ báo đã lưu + grace period |
| R3 | Đáp án lộ qua payload / devtools | Trung bình | Cao | DTO riêng + test tự động trên payload |
| R4 | Login đồng loạt trước giờ thi làm nghẽn CPU | Trung bình | Trung bình | Khuyến khích đăng nhập sớm; mở trang hướng dẫn trước 15 phút; đo trong load test |
| R5 | Worker hết giờ chậm → attempt treo `InProgress` | Thấp | Trung bình | Lazy check ở mọi request + cảnh báo khi có attempt quá hạn > 2 phút |
| R6 | Chấm điểm sai khi admin sửa câu hỏi giữa kỳ thi | Trung bình | Cao | Chấm theo snapshot |
| R7 | Đồng hồ máy dealer sai | Cao | Thấp | Countdown theo `serverNowUtc` |
| R8 | Dealer mở 2 tab/2 thiết bị cùng làm bài | Trung bình | Trung bình | Cùng attempt; `clientSeq` theo từng tab có thể xung đột → đề xuất server trả `version` mới nhất và client đồng bộ lại khi thấy seq lớn hơn của mình |
| R9 | Phạm vi phình (multi-choice, email, attendance tự động) | Cao | Trung bình | Giữ danh sách "ngoài MVP"; mọi thay đổi qua change request |
| R10 | Load test fail do dữ liệu/script không đúng thay vì do hệ thống | Cao | Trung bình | Dùng script đã sửa ở [07](07-kiem-thu-tai.md); chạy k6 nhỏ từ tuần 6 |
| R11 | Ngân sách chưa chốt | — | Cao | Chốt trước tuần 3 |
| R12 | Index chống thi 2 lần bị `prisma db push` xóa mất | Trung bình | Cao | Dùng `prisma migrate`, kiểm tra index trong CI ([10 §6](10-cong-nghe.md#lưu-ý-với-prisma)) |
| R13 | Chạy thương mại trên Vercel Hobby / Neon free | Trung bình | Cao | Vercel Hobby không cho dùng thương mại; Neon free không đủ tải → dự trù gói trả phí trong chi phí vận hành |
| R14 | `bcryptjs` làm nghẽn CPU khi 1.000 người login cùng lúc | Trung bình | Trung bình | Đo trong load test; khuyến khích đăng nhập sớm; chuyển `bcrypt` native nếu cần |

## 4. Nhật ký quyết định

| Ngày | Mục | Quyết định | Người quyết |
|---|---|---|---|
| 2026-10-12 | Stack | Dùng stack TrackMyGoal (Next.js 15 + Prisma 6 + NextAuth v5 + shadcn/ui) thay ASP.NET Core | Chủ dự án |
| 2026-10-12 | Q21 Hosting | Đích đến Vercel + Neon Postgres, **làm sau**. Hiện dev trên SQL Server local | Chủ dự án |
| 2026-10-12 | Kiểm thử giao diện | Dùng Playwright (chạy có giao diện, xem trực tiếp), không dùng Claude in Chrome / chụp màn hình | Chủ dự án |
| 2026-10-12 | Q1–Q20 | Code đang chạy theo cột "Đề xuất" ở mục 1 (điểm đạt 70%, 1 đáp án, khoảng ngày, email + mật khẩu, giao theo khu vực/mã, điểm ngay + đáp án sau khi đóng, không gửi email, điểm danh khi bấm "Tham gia", 1 đại lý = 1 tài khoản, cắt deadline theo giờ đóng, grace 10 giây, `reasonCategory`, đánh dấu câu lưu ở trình duyệt, mật khẩu tạm + bắt đổi, mã trùng khi import = báo lỗi, câu trong kỳ thi đang mở bị loại khỏi ôn tập, nhiều admin + trang Cài đặt, nút Meet mở trước 15 phút, hoàn thành khóa = xong tài liệu bắt buộc) | Mặc định, **chờ chủ dự án xác nhận** |

## 5. Cập nhật rủi ro sau khi code

| # | Trạng thái |
|---|---|
| R1 Race tạo 2 attempt | ✅ Giảm thiểu: `slotKey` UNIQUE + bắt `P2002`; smoke test 2 request đồng thời → cùng `attemptId` |
| R2 Mất câu trả lời do mạng | ✅ Hàng đợi + retry backoff + banner mất kết nối + chặn rời trang khi còn câu chưa lưu + grace 10 giây |
| R3 Lộ đáp án | ✅ DTO riêng + test |
| R5 Attempt treo | ✅ Lazy check + cron; dashboard admin cảnh báo khi có lượt quá hạn > 2 phút |
| R6 Sửa câu hỏi giữa kỳ thi | ✅ Chấm theo snapshot; sửa câu đã xuất bản tăng version |
| R8 Hai tab cùng làm bài | ✅ Giảm thiểu: lần lưu có seq thấp hơn bị server bỏ qua; client nhận `version` mới hơn thì hiển thị lại đáp án đang lưu trên server và nâng `clientSeq`. Hai tab vẫn có thể "giành" nhau ở cùng một câu — chấp nhận ở MVP |
| R12 `db push` xóa index | ✅ Không còn rủi ro: không dùng index tạo thủ công |
| R14 `bcryptjs` khi login đồng loạt | ⏳ Cần đo bằng k6 |

## 6. Google Meet bản miễn phí (cập nhật 2026-10-12)

Chủ dự án dùng **Google Meet miễn phí** (tài khoản Gmail cá nhân), không có Google Workspace. Hệ quả:

| Hạng mục | Ảnh hưởng | Cách xử lý trong app |
|---|---|---|
| Q8 điểm danh | Bản miễn phí không có báo cáo điểm danh, không có Meet API → không biết ai ở lại trong phòng bao lâu | **Đã chốt:** điểm danh = đại lý bấm "Tham gia" trong app. Admin xem số lượng + danh sách đã/chưa tham gia, giờ bấm, xuất Excel tại `/admin/training-sessions/[sessionId]` |
| Giới hạn thời lượng | Theo chính sách Google tại thời điểm viết: họp nhóm từ 3 người trở lên bị giới hạn khoảng 60 phút (**cần kiểm tra lại với Google**) | Buổi dài hơn → chia thành nhiều buổi / nhiều link trong app |
| Giới hạn số người | Theo chính sách Google tại thời điểm viết: tối đa khoảng 100 người/phòng (**cần kiểm tra lại**) | Với ~850 đại lý: chia buổi theo khu vực, mỗi buổi giao một nhóm đại lý |
| Mở rộng sau này | Nếu cần điểm danh chính xác hơn | (1) "Mã điểm danh" người trình bày đọc trong buổi, đại lý nhập vào app; hoặc (2) nâng Google Workspace để import báo cáo điểm danh |

## 7. Q7 — Thông báo (cập nhật 2026-10-12)

**Đã làm:** thông báo **trong app** (chuông góc phải + trang `/notifications`) cho cả 2 vai trò — chi tiết loại thông báo ở Docs/03 §7.1.
**Chưa làm:** gửi email / Zalo / SMS. Cần chốt kênh và nhà cung cấp; khi có thể gửi kèm từ `lib/notifications.ts` (cùng `dedupeKey`).
Giới hạn hiện tại: đại lý chỉ thấy thông báo khi mở app (không có push khi tắt trình duyệt).

## 8. Xếp hạng — quyết định mặc định (2026-10-12)

`CẦN CHỐT`: có công khai bảng xếp hạng giữa các đại lý không? Hiện mặc định **không** (đại lý chỉ thấy hạng của mình), admin bật theo từng kỳ thi bằng "Công khai bảng xếp hạng cho đại lý". Lý do: đặc tả Docs/01 §3 nêu đại lý chỉ xem dữ liệu của chính mình.
