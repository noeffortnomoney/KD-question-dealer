# 05 — API

Base path: `/api`. JSON, UTF-8, HTTPS bắt buộc. Thời gian trả về dạng ISO-8601 UTC (`2026-10-12T03:15:00.000Z`).

## 1. Quy ước

| Quy ước | Nội dung |
|---|---|
| Xác thực | NextAuth v5, session JWT trong cookie HttpOnly (theo TrackMyGoal). Không có Bearer token |
| Phân quyền | Theo vai trò (`admin`, `dealer`) **và** theo phạm vi dữ liệu. `dealerId` luôn lấy từ session (`requireDealer()`), không bao giờ từ body/query. Route Handler không đi qua middleware nên phải tự guard |
| Kiểu endpoint | Luồng thi, ôn tập, upload/import, export, cron → **Route Handler** (bảng dưới). CRUD quản trị → **Server Action** trong `lib/actions/*`, trả `{ success: true }` hoặc `{ error }` ([10 §4](10-cong-nghe.md#4-server-action-hay-route-handler)) |
| Lỗi (Route Handler) | JSON `{ error, code, correlationId }` + status HTTP tương ứng |
| Danh sách | `?page=1&pageSize=20&sort=createdAt:desc&q=...`; `sort` và filter theo **whitelist** |
| Idempotency | Save answer dùng `clientSeq`; submit idempotent theo trạng thái attempt |
| Upload | Giới hạn kích thước (đề xuất 5 MB cho import, `CẦN CHỐT` cho tài liệu); kiểm tra cả MIME và extension |
| Rate limit | Login, bắt đầu thi, save answer, submit — xem [06](06-bao-mat.md) |

### Định dạng lỗi

```json
{
  "error": "Bài thi đã kết thúc",
  "code": "ATTEMPT_CLOSED",
  "correlationId": "c0a8e1f2-7b3d-4e2a-9f10-5d6c7b8a9e01",
  "fields": { "selectedOptionId": "..." }
}
```

### Mã lỗi nghiệp vụ

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Sai đăng nhập (một thông báo chung, không phân biệt sai email hay sai mật khẩu) |
| `ACCOUNT_LOCKED` | 403 | Tài khoản bị khóa |
| `FORBIDDEN` | 403 | Không đủ quyền |
| `NOT_FOUND` | 404 | Không tồn tại **hoặc** không thuộc quyền xem (không phân biệt) |
| `VALIDATION_FAILED` | 422 | Dữ liệu không hợp lệ, chi tiết trong `errors` |
| `EXAM_NOT_OPEN` | 409 | Kỳ thi chưa mở / đã đóng |
| `EXAM_NOT_ASSIGNED` | 403 | Dealer không được giao kỳ thi |
| `EXAM_INSUFFICIENT_QUESTIONS` | 409 | Không đủ 30 câu Published (EX-01) |
| `ATTEMPT_ALREADY_USED` | 409 | Đã dùng lượt thi chính thức |
| `ATTEMPT_CLOSED` | 409 | Attempt đã nộp / hết giờ / bị hủy |
| `INVALID_OPTION` | 422 | Lựa chọn không thuộc câu hỏi |
| `RESULT_NOT_PUBLISHED` | 403 | Policy chưa cho xem điểm/đáp án |
| `CONCURRENCY_CONFLICT` | 409 | Bản ghi đã bị người khác sửa (rowversion) |
| `RATE_LIMITED` | 429 | Vượt giới hạn, kèm `Retry-After` |

## 2. Danh sách endpoint

### Xác thực & tài khoản

Spec liệt kê `POST /api/auth/login`; với NextAuth, đăng nhập/đăng xuất do `app/api/auth/[...nextauth]/route.ts` xử lý.

| Kiểu | Endpoint / hàm | Quyền | Mục đích |
|---|---|---|---|
| NextAuth | `signIn("credentials", …)` → `POST /api/auth/callback/credentials` | Public | Đăng nhập (thay cho `/auth/login` của spec) |
| NextAuth | `signOut()` | Đã đăng nhập | Đăng xuất |
| NextAuth | `GET /api/auth/session` | Đã đăng nhập | Thông tin phiên (thay cho `/me`) |
| Route Handler | `POST /api/auth/forgot-password` | Public | Gửi link đặt lại; luôn trả 202. Cần dịch vụ email (Q7) |
| Route Handler | `POST /api/auth/reset-password` | Public (token) | Đặt mật khẩu mới *(bổ sung, spec thiếu)* |
| Server Action | `changePassword()` | Đã đăng nhập | Đổi mật khẩu, bắt buộc lần đầu nếu dùng mật khẩu tạm (giống `ChangePasswordDialog` của TrackMyGoal) |

### Đại lý

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/dealer/dashboard` | Dữ liệu UI-02 trong một lần gọi |
| GET | `/courses` | Khóa học được giao (`?status=open|upcoming|completed`) |
| GET | `/courses/{courseId}` | Chi tiết, tài liệu, tiến độ, lịch |
| GET | `/courses/{courseId}/materials/{materialId}/download` | Trả signed URL có hạn + ghi `MaterialProgress` *(bổ sung)* |
| POST | `/courses/{courseId}/materials/{materialId}/complete` | Đánh dấu hoàn thành tài liệu *(bổ sung)* |
| GET | `/training-sessions?scope=upcoming|past|all` | Lịch training + link Meet (spec: `/training-sessions/upcoming`) |
| GET | `/practice/categories` | Chủ đề ôn tập |
| POST | `/practice/sessions` | Tạo phiên ôn tập |
| GET | `/practice/sessions/{id}` | Lấy phiên (khôi phục khi F5) *(bổ sung)* |
| POST | `/practice/sessions/{id}/answers` | Trả lời câu ôn tập |
| GET | `/practice/sessions?mine` | Lịch sử luyện tập *(bổ sung)* |
| GET | `/exams/available` | Kỳ thi được giao, kèm trạng thái nút (xem [03 §4](03-giao-dien.md#4-trạng-thái-nút-kỳ-thi-phía-đại-lý)) |
| GET | `/exams/{examId}` | Thông tin UI-05 *(bổ sung)* |
| POST | `/exams/{examId}/attempts` | Bắt đầu hoặc tiếp tục thi |
| GET | `/attempts/{attemptId}` | Trạng thái, deadline, câu hỏi, đáp án đã lưu |
| PUT | `/attempts/{attemptId}/answers/{attemptQuestionId}` | Autosave |
| POST | `/attempts/{attemptId}/submit` | Nộp bài |
| GET | `/attempts/{attemptId}/result` | Kết quả theo policy |
| GET | `/me/attempts` | Kết quả của tôi *(bổ sung)* |

### Quản trị

Các dòng `CRUD`, `lock/unlock`, `publish/close`, `assignments`, `enrollments`, `attendance`, `reissue` hiện thực bằng **Server Action** (đường dẫn trong bảng chỉ để gọi tên chức năng). Upload/import, export file và tải file lỗi dùng **Route Handler** vì cần `multipart` hoặc trả file.

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/admin/dashboard` | Dữ liệu UI-09 *(bổ sung)* |
| CRUD | `/admin/dealers` | Quản lý đại lý + tài khoản *(spec thiếu CRUD đơn lẻ, chỉ có import)* |
| POST | `/admin/dealers/{id}/lock`, `/unlock` | Khóa/mở *(bổ sung)* |
| GET | `/admin/dealers/import/template` | Tải file mẫu *(bổ sung)* |
| POST | `/admin/dealers/import/preview` | Upload + validate, trả `jobId` + preview |
| POST | `/admin/dealers/import/commit` | Xác nhận import theo `jobId` |
| GET | `/admin/dealers/imports/{jobId}/errors` | Tải file lỗi (XLSX/CSV) |
| GET | `/admin/dealers/export` | Export danh sách *(bổ sung)* |
| CRUD | `/admin/courses` | Khóa học |
| CRUD | `/admin/courses/{id}/materials` | Tài liệu, upload file *(bổ sung)* |
| CRUD | `/admin/courses/{id}/sessions` | Lịch training *(bổ sung)* |
| PUT | `/admin/courses/{id}/enrollments` | Phân công đại lý *(bổ sung)* |
| PUT | `/admin/sessions/{id}/attendance` | Nhập điểm danh thủ công *(bổ sung)* |
| CRUD | `/admin/question-categories` | Chủ đề *(bổ sung)* |
| CRUD | `/admin/questions` | Ngân hàng câu hỏi |
| POST | `/admin/questions/{id}/publish`, `/archive` | Đổi trạng thái, có audit *(bổ sung)* |
| CRUD | `/admin/exams` | Kỳ thi |
| PUT | `/admin/exams/{id}/assignments` | Giao kỳ thi *(bổ sung)* |
| POST | `/admin/exams/{id}/publish`, `/close` | Mở/đóng, kiểm tra EX-01 *(bổ sung)* |
| GET | `/admin/reports/exams/{examId}` | Báo cáo kỳ thi |
| GET | `/admin/reports/exams/{examId}/export?format=xlsx|csv` | Export *(bổ sung)* |
| GET | `/admin/attempts/{attemptId}` | Chi tiết lượt thi UI-21 *(bổ sung)* |
| POST | `/admin/attempts/{attemptId}/reissue` | Cấp lại lượt, bắt buộc lý do |
| GET | `/admin/audit-logs` | Tra cứu audit log |

## 3. Hợp đồng chi tiết cho luồng thi

Đây là các endpoint trong kịch bản tải; k6 phải bám đúng hợp đồng này (xem [07](07-kiem-thu-tai.md)).

### Đăng nhập (NextAuth Credentials)

UI gọi `signIn("credentials", { email, password, redirect: false })`. Ở tầng HTTP (k6 dùng cách này):

1. `GET /api/auth/csrf` → `{ "csrfToken": "..." }` + cookie CSRF.
2. `POST /api/auth/callback/credentials` (form-urlencoded) với `email`, `password`, `csrfToken`, `json=true`.
3. Thành công → cookie session (`authjs.session-token`, hoặc `__Secure-authjs.session-token` trên HTTPS). Sai mật khẩu → không có cookie session.

Payload JWT/session chứa: `id`, `name`, `role` (`admin`/`dealer`), `dealerId`, `mustChangePassword`.

### `POST /api/exams/{examId}/attempts`

Không có body. **201** (tạo mới) hoặc **200** (tiếp tục):

```json
{
  "attemptId": "8f1c2a4e-0b7d-ef11-9a3c-00155d0a1b2c",
  "examId": 7,
  "title": "Kỳ thi kiến thức sản phẩm Kymdan",
  "status": "InProgress",
  "startedAtUtc": "2026-10-12T02:00:00.000Z",
  "deadlineAtUtc": "2026-10-12T02:45:00.000Z",
  "serverNowUtc": "2026-10-12T02:00:00.120Z",
  "questions": [
    {
      "attemptQuestionId": 90001,
      "order": 1,
      "stem": "Đặc điểm nào là ưu điểm nổi bật của nệm cao su Kymdan?",
      "options": [
        { "optionId": 5011, "text": "Độ đàn hồi cao và bền bỉ" },
        { "optionId": 5012, "text": "Trọng lượng nhẹ, dễ di chuyển" }
      ],
      "selectedOptionId": null,
      "version": 0
    }
  ]
}
```

Không có `isCorrect`, `correctOptionId`, `explanation` trong payload này.

### `GET /api/attempts/{attemptId}`

Cùng cấu trúc như trên. Dùng khi F5 / khôi phục. Nếu attempt đã kết thúc trả `status` khác `InProgress` và **không** trả `questions`; client chuyển sang trang kết quả.

### `PUT /api/attempts/{attemptId}/answers/{attemptQuestionId}`

```json
{ "selectedOptionId": 5011, "clientSeq": 17 }
```

200:

```json
{ "attemptQuestionId": 90001, "selectedOptionId": 5011, "version": 17, "savedAtUtc": "2026-10-12T02:03:11.402Z", "serverNowUtc": "2026-10-12T02:03:11.402Z" }
```

`selectedOptionId: null` = bỏ chọn. Nếu `clientSeq` cũ hơn bản đã lưu → vẫn 200, trả `version` và `selectedOptionId` hiện tại.

### `POST /api/attempts/{attemptId}/submit`

Body tùy chọn: `{ "idempotencyKey": "..." }`. 200:

```json
{
  "attemptId": "8f1c2a4e-...",
  "status": "Submitted",
  "submittedAtUtc": "2026-10-12T02:42:15.000Z",
  "answeredCount": 28,
  "totalQuestions": 30,
  "result": { "visible": true, "scorePercent": 86.67, "isPassed": true }
}
```

Nếu `ShowScorePolicy = AfterExamEnds`: `"result": { "visible": false, "availableAtUtc": "..." }`.

### `GET /api/attempts/{attemptId}/result`

```json
{
  "status": "Submitted",
  "durationSeconds": 2535,
  "submittedAtUtc": "2026-10-12T02:42:15.000Z",
  "score": { "visible": true, "correct": 26, "total": 30, "scorePercent": 86.67, "passMarkPercent": 70, "isPassed": true },
  "answers": { "visible": false, "availableAtUtc": "2026-10-20T10:00:00.000Z" }
}
```

Khi `answers.visible = true` mới kèm danh sách câu, lựa chọn của dealer, đáp án đúng và giải thích.

### `POST /api/admin/attempts/{attemptId}/reissue`

```json
{ "reason": "Mất điện tại cửa hàng, xác nhận bởi ASM khu vực", "reasonCategory": "DealerDeviceOrNetwork" }
```

200: attempt cũ ở trạng thái `Voided`, kèm `auditLogId`.

### `POST /api/admin/dealers/import/preview`

`multipart/form-data`, field `file` (.xlsx/.csv). 200:

```json
{
  "jobId": 31,
  "totalRows": 850,
  "validRows": 842,
  "errorRows": 8,
  "preview": [ { "row": 2, "dealerCode": "HCM001", "dealerName": "...", "email": "...", "status": "valid" } ],
  "errors": [ { "row": 17, "column": "Email", "code": "DUPLICATE_IN_FILE", "message": "Email trùng với dòng 9" } ],
  "expiresAtUtc": "2026-10-13T02:00:00.000Z"
}
```

Lỗi theo dòng tối thiểu: `REQUIRED`, `INVALID_FORMAT`, `DUPLICATE_IN_FILE`, `ALREADY_EXISTS`, `TOO_LONG`.

`CẦN CHỐT`: dòng đã tồn tại (`DealerCode` trùng DB) thì **bỏ qua**, **cập nhật**, hay **báo lỗi**? Đề xuất MVP: báo lỗi, admin sửa thủ công.

### Cột file template import (đề xuất)

| Cột | Bắt buộc | Ràng buộc |
|---|---|---|
| Mã đại lý | ✔ | ≤ 50 ký tự, unique |
| Tên đại lý | ✔ | ≤ 200 |
| Họ tên người dùng | ✔ | ≤ 200 |
| Email đăng nhập | ✔ | Định dạng email, unique |
| Số điện thoại | | ≤ 30, chỉ số và `+` |
| Khu vực | | Thuộc danh mục khu vực nếu có |

Chống CSV/Excel injection khi **export**: ô bắt đầu bằng `=`, `+`, `-`, `@` phải được thêm tiền tố `'`.

## 4. Trạng thái hiện thực (2026-10-12)

| Nhóm | Trạng thái |
|---|---|
| Luồng thi `/api/exams/*`, `/api/attempts/*` | ✅ Đúng hợp đồng ở mục 3. Lỗi trả `{ error, code }` |
| Ôn tập `/api/practice/*` | ✅ `categories`, `sessions` (POST), `sessions/{id}` (GET), `sessions/{id}/answers` (POST). Lịch sử luyện tập render phía server ở `/practice` |
| Đăng nhập | ✅ NextAuth (`/api/auth/*`). `loginAction` gọi `signIn` rồi chuyển thẳng tới trang chủ theo vai trò |
| Đổi mật khẩu | ✅ Server Action `changePasswordAction`; bắt buộc khi `mustChangePassword` |
| Quên mật khẩu / đặt lại qua email | ⏳ **Chưa làm** — chưa có dịch vụ email (Q7). Hiện admin cấp lại mật khẩu tạm ở `/admin/dealers` |
| Import / export / tải file lỗi / template | ✅ Route Handler như bảng mục 2 |
| Tải tài liệu khóa học | ✅ `GET /api/materials/{id}/download` (kiểm tra đại lý được giao + ghi tiến độ). Upload: `POST /api/admin/courses/{courseId}/materials` |
| CRUD quản trị, giao kỳ thi / khóa học, cấp lại lượt | ✅ Server Action trong `lib/actions/admin/*` |
| Dashboard đại lý / admin, `/me/attempts` | ✅ Render phía server (`/dashboard`, `/admin`, `/my-results`), không tách API riêng |
| Cron hết giờ | ✅ `GET /api/cron/expire-attempts` với `Authorization: Bearer $CRON_SECRET`; đồng thời dọn phiên import hết hạn |
| Rate limit | ⏳ **Chưa làm** — xem [06 §4](06-bao-mat.md#4-rate-limit). Hiện chỉ có khóa tài khoản sau 5 lần đăng nhập sai |

### Thông báo (2026-10-12)

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/notifications?limit=15` | Sinh nhắc việc theo thời gian cho user hiện tại rồi trả `{ unread, total, items[] }`. Chuông gọi khi mở trang, khi đổi trang, khi cửa sổ được focus và mỗi 60 giây (chỉ khi tab đang hiển thị) |
| POST | `/api/notifications/read` | `{ ids: [...] }` hoặc `{ all: true }` → đánh dấu đã đọc, chỉ trong phạm vi thông báo của chính user |
| GET | `/notifications/open/{id}` | Đánh dấu đã đọc rồi chuyển tới `link` của thông báo (chỉ nhận đường dẫn nội bộ bắt đầu bằng `/`) |

### Xếp hạng (2026-10-12)

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/admin/exams/{examId}/ranking/export?region=&q=` | Xuất Excel bảng xếp hạng (admin) |

Trang xếp hạng của admin và đại lý render phía server bằng `lib/ranking.ts` (`getExamRanking`, `getDealerRanking`), không có API JSON riêng.

### Import câu hỏi (2026-10-12)

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/admin/questions/import/template` | Tải file mẫu `.xlsx` |
| POST | `/api/admin/questions/import/preview` | `multipart` `file` → đọc + kiểm tra, **không lưu**. Trả `{ totalRows, validRows, errorRows, newCategories[], rows[{ row, category, newCategory, stem, options[], correct, difficulty, errors[] }] }` |
| POST | `/api/admin/questions/import/commit` | `multipart` `file` + `publish=true\|false` → kiểm tra lại toàn bộ trên dữ liệu DB hiện tại, tạo chủ đề mới, tạo câu hỏi hợp lệ (bỏ dòng lỗi), ghi audit `Question.Import`. Trả `{ created, skipped, published, createdCategories[] }` |

Khác import đại lý: không lưu phiên import vào DB — trình duyệt giữ file và gửi lại khi xác nhận; server kiểm tra lại từ đầu nên dữ liệu thay đổi giữa hai bước vẫn an toàn. Upload lại cùng file sẽ bị chặn vì mọi câu đều đã tồn tại.
