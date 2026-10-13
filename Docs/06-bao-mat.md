# 06 — Bảo mật và quyền riêng tư

## 1. Xác thực

| Hạng mục | Yêu cầu |
|---|---|
| Thư viện | NextAuth v5 Credentials + `bcryptjs` (theo TrackMyGoal). Không tự viết thuật toán hash |
| Mật khẩu | **Hiện thực (quyết định của chủ dự án 2026-10-13):** tài khoản mới (thêm đại lý, thêm quản trị viên, import đại lý — file import không còn cột mật khẩu) nhận mật khẩu mặc định `123456`; mật khẩu khi đổi hoặc admin cấp lại chỉ cần **tối thiểu 6 ký tự**, không bắt buộc chữ/số (`lib/password-rules.ts`). Cấp lại mật khẩu: admin nhập mật khẩu mới, mặc định điền sẵn `123456`. bcrypt cost 10; cột `MustChangePassword` buộc đổi lần đầu và sau khi cấp lại (middleware chuyển hướng tới trang đổi mật khẩu), mật khẩu mới phải khác mật khẩu hiện tại. Rủi ro: `123456` ai cũng đoán được → tài khoản chưa đăng nhập lần đầu có thể bị người khác chiếm nếu biết email; giảm thiểu nhờ khóa 15 phút sau 5 lần sai và bắt đổi ngay lần đầu |
| Thông báo lỗi | `authorize()` trả `null` cho mọi trường hợp sai (email không tồn tại, sai mật khẩu, tài khoản khóa) → một thông báo chung; forgot-password luôn trả 202 |
| Khóa tạm | Lockout sau N lần sai (đề xuất 5 lần / 15 phút) **theo tài khoản**, không theo IP — nhiều dealer có thể dùng chung NAT cửa hàng. NextAuth không có sẵn → thêm cột `FailedLoginCount`, `LockedUntilUtc` |
| Phiên | Session JWT trong cookie `HttpOnly`, `Secure`, `SameSite=Lax`; NextAuth tự lo CSRF cho luồng đăng nhập. Server Action có kiểm tra origin (`serverActions.allowedOrigins`) |
| Phiên thi | JWT **không được hết hạn giữa bài thi**: giữ `maxAge` mặc định đủ dài, hoặc tối thiểu ≥ 45 phút + biên |
| Khóa tài khoản đang đăng nhập | JWT không bị thu hồi khi admin khóa tài khoản → các guard (`requireDealer`) kiểm tra lại `Status` trong DB ở những thao tác quan trọng (bắt đầu thi, nộp bài) |
| `AUTH_SECRET` | Sinh riêng cho mỗi môi trường (`openssl rand -base64 32`), lưu ở biến môi trường của nơi deploy |

Chi phí CPU khi đăng nhập: `bcryptjs` là bcrypt viết bằng JavaScript thuần, mỗi lần so mật khẩu tốn hàng chục ms CPU trên luồng chính của Node. 1.000 dealer đăng nhập dồn trong vài phút trước giờ thi là **điểm nghẽn tiềm năng** — phải đo trong load test; không giảm cost để "qua bài test". Nếu nghẽn: khuyến khích đăng nhập sớm, hoặc chuyển sang gói `bcrypt` native.

## 2. Phân quyền

- Theo pattern TrackMyGoal ([10 §3](10-cong-nghe.md#3-xác-thực-và-phân-quyền-theo-pattern-trackmygoal)): `middleware.ts` chặn trang; **mọi** Route Handler và Server Action tự gọi `requireAdmin()` / `requireDealer()` vì cả hai không đi qua middleware.
- Kiểm tra **theo resource** ở mọi truy vấn: `WHERE AttemptId = @id AND DealerId = @currentDealerId`. Không tìm thấy → 404 (không tiết lộ tồn tại).
- Không nhận `DealerId`/`UserId` từ client cho API đại lý.
- Popup xác nhận (UI-24) **không thay thế** kiểm tra quyền ở backend.
- Test tự động bắt buộc: dealer A gọi API với attemptId của dealer B, hoặc tải tài liệu của buổi training không được giao → 404 (`e2e/materials.spec.ts`).

## 3. Chống lộ đáp án

| Rủi ro | Biện pháp |
|---|---|
| Đáp án nằm trong payload thi | DTO riêng cho câu hỏi thi; integration test assert payload không chứa `isCorrect`, `correctOptionId`, `explanation` |
| Lộ qua thứ tự lựa chọn (đáp án đúng luôn là A) | Trộn lựa chọn theo từng attempt khi cấu hình bật; admin nhập câu hỏi không bị ép thứ tự |
| Lộ qua API ôn tập | Câu hỏi đang nằm trong kỳ thi Official đang mở **không** được xuất hiện trong ôn tập (`CẦN CHỐT`, đề xuất bật) |
| Lộ qua kết quả trước khi công bố | `GET /result` kiểm tra `ShowAnswerPolicy` + thời điểm `EndsAtUtc` ở server |
| Lộ qua log | Không log body của request/response thi |

## 4. Rate limit

Next.js không có rate limiter sẵn. Bộ đếm phải nằm ở nơi dùng chung giữa các instance (DB hoặc Redis/Upstash); bộ đếm in-memory kiểu `lib/rate-limit.ts` của Internal_Order_App chỉ đúng khi chạy một process. Partition theo **user** (đã đăng nhập) hoặc theo tài khoản đang thử đăng nhập. Giá trị đề xuất, phải hiệu chỉnh sau load test:

| Endpoint | Giới hạn | Ghi chú |
|---|---|---|
| Đăng nhập (`authorize`) | 10 / phút / tài khoản; 300 / phút / IP | IP rộng vì nhiều dealer có thể chung NAT |
| `POST /auth/forgot-password` | 3 / giờ / email | |
| `POST /exams/{id}/attempts` | 10 / phút / user | |
| `PUT /attempts/.../answers/...` | 120 / phút / user | Người dùng bấm nhanh + retry |
| `POST /attempts/{id}/submit` | 10 / phút / user | Idempotent nên retry an toàn |

Yêu cầu spec: **không khóa nhầm người dùng hợp lệ trong đợt cao điểm** → không áp rate limit toàn cục theo IP cho API thi.

## 5. Audit log

**Quyền xem (hiện thực 2026-10-13):** chỉ tài khoản quản trị `admin@kymdan.local` (`AUDIT_LOG_OWNER_EMAIL` trong `lib/roles.ts`). Chặn 3 lớp: menu ẩn (`navFor`), middleware chuyển về `/admin` (`canAccessPath` đọc email trong JWT), trang gọi `requireAuditLogViewer()` đọc email từ DB → `notFound()`. Mọi quản trị viên vẫn được **ghi** audit bình thường. Muốn đổi người xem → sửa hằng số này (email admin không sửa được trên giao diện).

Ghi vào `AuditLogs` (append-only, `DENY UPDATE/DELETE` cho tài khoản ứng dụng):

| Action | Khi nào | `DetailsJson` |
|---|---|---|
| `Dealer.Import` | Commit import | jobId, số dòng thành công/lỗi |
| `Dealer.Create/Update/Lock/Unlock` | CRUD đại lý | before/after (không chứa mật khẩu) |
| `User.RoleChange` | Đổi vai trò | before/after |
| `Question.Publish/Archive/Update` | Đổi câu hỏi đã published | before/after |
| `Exam.Publish/Close/Update` | Đổi kỳ thi | before/after |
| `Attempt.Reissue` | Cấp lại lượt | before/after, reason, reasonCategory |
| `Attempt.ScoreAdjust` | Điều chỉnh điểm (nếu có) | before/after, reason |
| `Auth.LoginFailed` (tùy chọn) | Đăng nhập sai | email đã che bớt, IP |

Mỗi bản ghi có `CorrelationId` trùng với `correlationId` trong response lỗi và log ứng dụng.

## 6. Upload & file

- Import: chỉ `.xlsx`, `.csv`; kiểm tra extension **và** magic bytes; giới hạn dung lượng và số dòng (đề xuất 5 MB / 5.000 dòng).
- Parse Excel bằng `exceljs` hoặc SheetJS ≥ 0.20.2 (không dùng `xlsx@0.18.5` từ npm như TrackMyGoal — có lỗ hổng khi đọc file tải lên, xem [10 §7](10-cong-nghe.md#7-import-excel)). Không chấp nhận `.xlsm`.
- Tài liệu buổi training: lưu object storage private (hiện là `STORAGE_DIR`); tải qua Route Handler kiểm tra đại lý được giao buổi đó. Khi chuyển Blob: trả signed URL hết hạn sau ~10 phút.
- Quét malware theo khả năng hạ tầng.
- Export: chống CSV/Formula injection (tiền tố `'` cho ô bắt đầu bằng `= + - @`).

## 7. Hạ tầng

- HTTPS bắt buộc, HSTS. Secrets trong secret manager / biến môi trường được bảo vệ, **không commit vào Git**.
- Header bảo mật trong `next.config.ts` (mẫu có sẵn ở Internal_Order_App): `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`.
- Tài khoản DB của ứng dụng: quyền tối thiểu ở production; tài khoản chạy migration tách riêng.
- Route Handler cron kiểm tra header `Authorization: Bearer ${CRON_SECRET}`.
- Backup mã hóa; **thử restore** định kỳ (là tiêu chí nghiệm thu).

## 8. Dữ liệu cá nhân

Dữ liệu thu thập: tên, email, số điện thoại, khu vực, kết quả thi. Chỉ thu thập những gì cần.

`CẦN CHỐT` thời hạn lưu:

| Dữ liệu | Đề xuất |
|---|---|
| File import gốc | Xóa ngay sau commit hoặc sau 24 giờ |
| `ImportRows` / `ImportErrors` | 30 ngày |
| Hồ sơ thi | Theo chính sách đào tạo của Kymdan (đề xuất 3 năm) |
| Log ứng dụng | 90 ngày |
| Audit log | ≥ 1 năm |

## 9. Trạng thái hiện thực (2026-10-12)

| Hạng mục | Trạng thái |
|---|---|
| NextAuth Credentials + bcryptjs, thông báo lỗi chung | ✅ |
| Khóa 15 phút sau 5 lần sai (theo tài khoản) | ✅ `users.failed_login_count`, `locked_until` |
| Bắt đổi mật khẩu tạm lần đầu | ✅ middleware chuyển về `/change-password` |
| Guard ở mọi Route Handler / Server Action | ✅ `requireAdmin` / `requireDealer` / `requireActiveDealer` (bắt đầu thi, ôn tập kiểm tra lại trạng thái tài khoản trong DB) |
| Payload thi không lộ đáp án | ✅ có unit test + smoke test + e2e |
| Câu đang nằm trong kỳ thi mở bị loại khỏi ôn tập (Q16) | ✅ |
| Audit log | ✅ các thao tác ở mục 5 + `Session.*` (tạo, sửa, hủy, giao/bỏ giao, thêm/tải/xóa tài liệu), `Exam.Assign/AddQuestions…`. Dòng `Course.*` cũ vẫn giữ nhãn để đọc lịch sử |
| Upload: kiểm tra đuôi + magic bytes xlsx, giới hạn dung lượng; file lưu ngoài `public/` | ✅ |
| Export chống formula injection | ✅ `safeCell()` |
| Header bảo mật cơ bản | ✅ `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. ⏳ CSP chưa bật |
| Rate limit | ⏳ chưa làm |
| `DENY UPDATE/DELETE` trên `audit_logs` cho tài khoản ứng dụng | ⏳ làm khi dựng DB production (hiện dev dùng Windows auth) |
| Quét malware file upload | ⏳ theo hạ tầng |

### Thông báo (2026-10-12)

| Hạng mục | Trạng thái |
|---|---|
| Mỗi user chỉ đọc / đánh dấu thông báo của chính mình (`userId` lấy từ session, không nhận từ client) | ✅ |
| `/notifications/open/{id}` chỉ chuyển hướng tới đường dẫn nội bộ (bắt đầu bằng `/`, không `//`) → chống open redirect | ✅ |
| Lỗi khi tạo thông báo không làm hỏng thao tác chính (`notifySafely`) | ✅ |
| Nội dung thông báo không chứa đáp án hay điểm; chỉ báo "đã có kết quả" và dẫn tới trang kết quả có kiểm tra policy | ✅ |

### Xếp hạng (2026-10-12)

| Hạng mục | Trạng thái |
|---|---|
| Đại lý chỉ xem xếp hạng khi kỳ thi kết thúc + được công bố điểm + có bài được chấm (kiểm tra ở server) | ✅ |
| Mặc định đại lý chỉ thấy hạng của mình; top 10 chỉ khi admin bật `showLeaderboard`; top 10 không chứa mã đại lý | ✅ |
| Dữ liệu đầy đủ của đại lý khác chỉ tính ở server, không gửi xuống trình duyệt đại lý | ✅ |
