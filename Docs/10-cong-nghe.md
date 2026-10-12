# 10 — Công nghệ và cấu trúc code

**Quyết định:** không dùng stack gợi ý trong spec (ASP.NET Core + ASP.NET Core Identity). Dùng lại stack của project **TrackMyGoal** (`github.com/noeffortnomoney/TrackMyGoal`) vì đang vận hành ổn định trên production.

## 1. Stack

| Lớp | Công nghệ (theo TrackMyGoal) | Ghi chú cho dự án này |
|---|---|---|
| Framework | Next.js 15 App Router, TypeScript, React 19 | Giữ Next.js ≥ 15.5.25 — Vercel chặn build các bản có lỗ hổng (đã gặp ở TrackMyGoal 2026-09-10) |
| UI | Tailwind CSS v4, shadcn/ui (style `new-york`, `radix-ui`), lucide-react, sonner (toast), recharts (biểu đồ dashboard admin) | Đổi `--primary` sang đỏ Kymdan, xem [03 §5](03-giao-dien.md#5-design-token-trích-từ-mockup--cần-chốt-với-bộ-nhận-diện-kymdan-chính-thức) |
| Form & validate | zod ở server (Server Action / Route Handler); form client dùng state thường | Không dùng react-hook-form — form ở dự án này ngắn, validate chính ở server |
| Ngày giờ | `Intl.DateTimeFormat` (`lib/date-utils.ts`) | Lưu UTC, hiển thị `Asia/Ho_Chi_Minh` (UTC+7 cố định, không DST) |
| ORM | Prisma 6 | `prisma/schema.prisma` là nguồn chân lý của DB |
| Database | **Hiện tại:** SQL Server local, DB `KymdanDealerPortal`. **Sau này:** Vercel + Neon Postgres (đã chốt 2026-10-12, làm sau) | Xem mục 6 |
| Auth | NextAuth v5 (Auth.js), Credentials provider, session JWT, bcryptjs | Role + dealerId nằm trong JWT |
| Excel | TrackMyGoal dùng `xlsx@0.18.5` | **Không dùng bản này cho import** — xem mục 7 |
| Deploy | Vercel (region `sin1`) + Neon, tự build khi `git push origin main` | Gói Hobby không được dùng thương mại → cần Vercel Pro |
| Phát triển với Claude Code | `.claude/agents` (analyst / backend / frontend / qa) + skill `*-feature` | Có thể tái dùng mô hình harness `tmg-*` với tiền tố mới, ví dụ `kd-*` |

Thành phần **thêm mới** (TrackMyGoal không có):

| Nhu cầu | Đề xuất |
|---|---|
| Kiểm thử tải | k6 ([07](07-kiem-thu-tai.md)) |
| Job định kỳ (attempt hết giờ, dọn file import) | Vercel Cron gọi Route Handler có `CRON_SECRET` (Pro: tối thiểu 1 phút/lần; Hobby chỉ 1 lần/ngày) |
| Lưu file tài liệu khóa học | Vercel Blob hoặc object storage tương đương (function Vercel không có ổ đĩa bền) |
| Rate limit | Lưu bộ đếm ở DB hoặc Redis/Upstash — bộ đếm in-memory không dùng được khi chạy nhiều instance serverless |
| Unit test | Vitest — `lib/**/*.test.ts` (`npm test`) |
| Test giao diện e2e | **Playwright** — `e2e/*.spec.ts`. Mặc định chạy **có giao diện** (cửa sổ Chromium thật, slowMo 150 ms) để xem trực tiếp; `npm run test:e2e:ui` mở Playwright UI; `npm run test:e2e:ci` chạy headless. Không dùng Claude in Chrome / chụp màn hình để test (tốn token) |

## 2. Cấu trúc thư mục

Bám theo TrackMyGoal (không dùng `src/`, alias `@/`):

```
app/
  (auth)/login, change-password
  (dealer)/dashboard, courses, courses/[courseId], training-sessions, practice, practice/[sessionId],
           exams, exams/[examId], my-results
  (exam)/attempts/[attemptId], attempts/[attemptId]/result
  admin/ (page = dashboard), dealers, dealers/import, courses, courses/[id], training-sessions,
         questions, questions/[id], exams, exams/[id], reports, audit-logs, settings
  api/auth/[...nextauth]
  api/exams/available, api/exams/[examId]/attempts
  api/attempts/[attemptId], …/answers/[attemptQuestionId], …/submit, …/result
  api/practice/categories, api/practice/sessions, …/[sessionId], …/[sessionId]/answers
  api/materials/[materialId]/download
  api/admin/dealers/import/{template,preview,commit}, api/admin/dealers/imports/[jobId]/errors,
  api/admin/dealers/export, api/admin/reports/exams/[examId]/export,
  api/admin/courses/[courseId]/materials
  api/cron/expire-attempts
components/
  ui/            shadcn (lấy từ TrackMyGoal)
  layout/        AppShell, SidebarNav, MobileNav, UserMenu, Brand, nav.ts
  common/        PageHeader, StatCard, StatusBadge, FilterBar, Pagination, ConfirmAction, Field, EmptyState
  exam/          ExamRoom, QuestionGrid, OptionList, Countdown, SaveIndicator, SubmitDialog, StartExamButton, ExamActionButton
  learning/      SessionRow, JoinMeetButton, MaterialItem, SessionDateBadge
  practice/      PracticeStart, PracticeRunner
  admin/         DealerDialog, ImportWizard, QuestionForm, CategoryManager, ExamForm, AddExamQuestions,
                 AssignDealersDialog, CourseForm, MaterialManager, SessionDialog, ReportTable, AttemptDrawer,
                 CreateAdminDialog, ResetPasswordButton, CredentialNotice, charts/
lib/
  auth.ts, auth.config.ts, auth-guard.ts, roles.ts, prisma.ts, http.ts, ids.ts, audit.ts
  exam/          engine.ts, grading.ts, policy.ts, select.ts, snapshot.ts, types.ts, exam.test.ts
  import/        dealer-import.ts (+ test), excel.ts, existing.ts
  actions/       auth.ts, learning.ts, admin/{dealers,questions,exams,courses,attempts,users}.ts
  queries/       dealers.ts, learning.ts
  practice.ts, reports.ts, admin-stats.ts, assign.ts, storage.ts, password.ts, date-utils.ts, format.ts, labels.ts
prisma/          schema.prisma, seed.ts, seed-data.ts
scripts/         create-user.ts, seed-loadtest.ts
e2e/             Playwright: dealer.spec.ts, admin.spec.ts, helpers.ts
loadtest/        k6/exam_steady.js, README.md
Docs/
```

- `(exam)` có layout riêng tối giản (không sidebar) để dealer tập trung làm bài.
- Admin dùng tiền tố URL `/admin` thật (thư mục `admin/`), không chỉ là route group.

## 3. Xác thực và phân quyền (theo pattern TrackMyGoal)

| File | Vai trò | Quy tắc |
|---|---|---|
| `lib/roles.ts` | `type UserRole = "admin" \| "dealer"`, `toRole`, `homePathFor`, `canAccessPath` | **Edge-safe**: không import prisma / bcrypt / `lib/auth` |
| `lib/auth.config.ts` | Callback `jwt`/`session` đưa `id`, `role`, `dealerId` vào token | Dùng chung cho middleware (Edge) |
| `lib/auth.ts` | NextAuth + Credentials, `bcrypt.compare`, chặn tài khoản `Locked` | Chạy Node runtime |
| `lib/auth-guard.ts` | `requireUser()`, `requireAdmin()`, **thêm** `requireDealer()` trả `{ userId, dealerId }` | Trả object tươi `{ error }`, không `return guard` (giữ narrowing TS như ghi chú của TrackMyGoal) |
| `middleware.ts` | Chưa đăng nhập → `/login`; dealer vào `/admin/**` → về `/dashboard`; admin home = `/admin` | Matcher **loại trừ `api`** |

Hệ quả bắt buộc (đã rút ra từ TrackMyGoal):

- **Route Handler không đi qua middleware** → mọi file `app/api/**/route.ts` phải tự gọi `requireDealer()` / `requireAdmin()`; sai quyền trả 401/403.
- **Server Action cũng không đi qua middleware** (action POST tới URL trang hiện tại) → mọi action trong `lib/actions/*` phải tự guard.
- Không bao giờ select/trả `passwordHash`.
- Ẩn/hiện UI theo role: tính ở Server Component rồi truyền prop, không dùng `useSession()` (tránh nháy giao diện).

## 4. Server Action hay Route Handler

| Dùng | Khi nào | Lý do |
|---|---|---|
| **Server Action** (`lib/actions/*`) | CRUD quản trị, form đại lý, hồ sơ | Theo pattern TrackMyGoal: `requireX()` → zod `safeParse` → `prisma.$transaction` → ghi audit → `revalidatePath` → trả `{ success: true }` hoặc `{ error: "..." }`, không throw |
| **Route Handler** (`app/api/**`) | Toàn bộ luồng thi, ôn tập, upload/import, export file, cron | (1) Server Action từ cùng một client bị **xếp hàng tuần tự** (TrackMyGoal đã gặp khi luyện cờ chặn nước đi) → autosave sẽ nghẽn sau nhau; (2) k6 cần URL ổn định, ID của Server Action đổi mỗi lần build; (3) cần mã HTTP và mã lỗi rõ ràng ([05](05-api.md)) |

Route Handler trả JSON theo dạng: thành công → dữ liệu; lỗi → `{ error: "<thông báo>", code: "<MÃ_LỖI>" }` với status HTTP tương ứng.

## 5. Exam engine với Prisma

Toàn bộ nghiệp vụ thi nằm trong `lib/exam/engine.ts` (hàm thuần ở `grading.ts`, `policy.ts`, `select.ts`, `snapshot.ts` có unit test). Route Handler chỉ guard + parse + gọi engine. Các cơ chế dưới đây không phụ thuộc SQL Server hay Postgres (không raw SQL).

### Một lượt chính thức: `slotKey`

`ExamAttempt.slotKey` có `@unique`. Lượt còn hiệu lực mang `"<examId>:<dealerId>"`. Khi admin cấp lại lượt, lượt cũ chuyển `Voided` và đổi `slotKey` thành `"<examId>:<dealerId>:void:<attemptId>"`, giải phóng khóa cho lượt mới. Hai request "bắt đầu thi" đồng thời: một request thắng, request kia nhận `P2002` rồi đọc lại và trả cùng `attemptId`. Cách này thay cho filtered unique index ở [04](04-co-so-du-lieu.md), vì Prisma biểu diễn được trực tiếp nên `db push` không xóa mất.

### Lưu đáp án theo `clientSeq` ([02 §5](02-quy-tac-thi.md#5-autosave--put-apiattemptsattemptidanswersattemptquestionid))

Trong một transaction:

1. `updateMany` dòng `ExamAttempt` với điều kiện `status = InProgress` và `deadlineAt >= now − grace`, ghi `lastActivityAt`. Lệnh này **khóa dòng attempt** tới hết transaction, nên mọi lần lưu của cùng một attempt và `finalizeAttempt` đều chạy tuần tự. `count = 0` → `409 ATTEMPT_CLOSED`.
2. Đọc `AttemptAnswer`. Chưa có thì `create` với `version = clientSeq`. Có rồi mà `version >= clientSeq` thì giữ nguyên (request cũ đến muộn). Ngược lại thì `update`.

Vì đã khóa dòng attempt nên không có hai `create` song song, cũng không cần bắt `P2002` bên trong transaction (Postgres sẽ hủy cả transaction nếu một câu lệnh lỗi).

### Nộp bài / hết giờ chỉ chấm một lần

`finalizeAttempt(id, target)` chạy trong transaction: `updateMany({ where: { id, status: "InProgress" } })` → chỉ khi `count = 1` mới đọc snapshot + đáp án và chấm điểm trong cùng transaction. Submit, cron `/api/cron/expire-attempts` và lazy check (mọi request chạm attempt) đều gọi hàm này.

### Đã kiểm chứng

- Unit test `lib/exam/exam.test.ts`: chấm điểm, deadline, policy hiển thị, trạng thái nút, bốc đề, snapshot không lộ đáp án.
- Smoke test HTTP: bắt đầu đồng thời → cùng `attemptId`; seq 5 rồi 4 → giữ 5; lưu trùng seq idempotent; option của câu khác → 422; đăng nhập lại → cùng attempt, deadline giữ nguyên; submit đồng thời 2 lần → cùng điểm; lưu sau khi nộp → 409; bắt đầu lần 2 → 409.
- Playwright `e2e/dealer.spec.ts`: làm bài thật trên trình duyệt, autosave, F5, nộp bài.

### Đồng hồ

Giống đồng hồ cờ tướng của TrackMyGoal: server trả mốc (`serverNowUtc`, `deadlineAtUtc`), client tick 250 ms từ mốc đó; về 0 thì gọi submit. Server luôn là bên quyết định.

## 6. Database và hosting

**Quyết định (2026-10-12):** đích đến là **Vercel + Neon Postgres**, làm sau. Hiện tại dev trên SQL Server local.

Khi chuyển sang Neon:

1. Đổi `provider = "postgresql"` trong `schema.prisma`; bỏ các `@db.NVarChar`, `@db.UniqueIdentifier`, `dbgenerated("NEWSEQUENTIALID()")`, thay bằng `@db.Uuid` + `@default(uuid())`, `@db.Text`.
2. Dev local cũng chuyển sang Postgres (Neon branch hoặc Postgres local) — **không** giữ hai provider như TrackMyGoal, vì luật chống trùng dựa vào unique index và khóa dòng trong transaction.
3. Chạy lại `npm test`, `npm run test:e2e` và smoke test luồng thi trên Postgres.
4. File tài liệu khóa học: chuyển `lib/storage.ts` sang Vercel Blob (function Vercel không có ổ đĩa bền).
5. Thêm `vercel.json` với cron gọi `/api/cron/expire-attempts` mỗi phút (cần gói Pro), biến `CRON_SECRET`.

TrackMyGoal đang chạy **hai** provider: MSSQL ở dev và Neon Postgres ở prod, với `scripts/prepare-schema.js` chép `postgres.prisma` đè `schema.prisma` khi build trên Vercel. Cách này chấp nhận được cho app cá nhân, nhưng **không nên lặp lại** ở hệ thống thi.

| Phương án | A. Vercel Pro + Neon Postgres | B. Tự host `next start` + SQL Server |
|---|---|---|
| Giống project nào | TrackMyGoal (prod) | TrackMyGoal (dev), Internal_Order_App |
| Ưu | Không quản server; tự scale; deploy bằng `git push`; đã chạy ổn | Khớp spec (SQL Server) và `schema.sql`; dữ liệu nằm trong hạ tầng công ty; dễ chạy worker nền |
| Nhược | Vercel Hobby **cấm dùng thương mại** → phải Pro; Neon free (compute nhỏ) không đủ cho 1.000 người thi → cần gói trả phí; bắt buộc dùng pooled connection; file phải để Blob | Tự lo HTTPS, scale (nhiều process + reverse proxy), backup, giám sát |
| Đổi trong bộ tài liệu | SQL ở [04](04-co-so-du-lieu.md) và [07](07-kiem-thu-tai.md) chuyển sang cú pháp Postgres (bảng đối chiếu bên dưới) | Giữ nguyên |

Đối chiếu khi chọn Postgres:

| SQL Server | Postgres |
|---|---|
| `UNIQUEIDENTIFIER DEFAULT NEWSEQUENTIALID()` | `uuid` + `@default(uuid())` trong Prisma |
| `DATETIME2(3)` + `SYSUTCDATETIME()` | `timestamptz(3)` + `now()` |
| `NVARCHAR(MAX)` chứa JSON | `jsonb` |
| `JSON_VALUE(col, '$.x')` | `col->>'x'` |
| Luật 1 lượt: `slot_key` UNIQUE | Giữ nguyên (không cần partial index) |
| Collation `Vietnamese_100_CI_AI` cho tìm không dấu | Extension `unaccent` hoặc cột chuẩn hóa không dấu |

### Lưu ý với Prisma

- Theo ghi chú của TrackMyGoal ở MSSQL: ID dùng `@db.UniqueIdentifier @default(dbgenerated("NEWSEQUENTIALID()"))`; quan hệ nhiều đường dẫn khóa ngoại phải `onDelete: NoAction, onUpdate: NoAction`.
- Không dùng index có điều kiện: luật 1 lượt dùng `slotKey @unique`; "đúng 1 đáp án đúng" kiểm tra ở `saveQuestionAction` / `setQuestionStatusAction` và lọc lại khi bốc đề. Vì vậy `prisma db push` an toàn cho dev. Lên production nên chuyển sang `prisma migrate` để có lịch sử migration.
- Không dùng `Decimal`: `passMarkPercent` là `Int`, `scorePercent` là `Float` làm tròn 2 chữ số ở server → không phải convert trước khi trả cho Client Component.
- SQL Server trả GUID có thể khác hoa/thường so với chuỗi client gửi → so sánh qua `sameId()`.

## 7. Import Excel

TrackMyGoal dùng `xlsx@0.18.5` từ npm. Bản này có lỗ hổng đã công bố khi **đọc file do người dùng tải lên** (prototype pollution CVE-2023-30533, ReDoS CVE-2024-22363); SheetJS không phát hành bản vá lên npm nữa. Với chức năng import đại lý, chọn một trong hai:

- `exceljs` (npm), hoặc
- SheetJS ≥ 0.20.2 cài từ CDN chính thức của SheetJS.

Chỉ nhận `.xlsx`/`.csv`, giới hạn kích thước và số dòng ([06 §6](06-bao-mat.md#6-upload--file)).

## 8. Những điều không mang theo từ TrackMyGoal

| Thiết lập ở TrackMyGoal | Lý do không dùng |
|---|---|
| `typescript.ignoreBuildErrors: true`, `eslint.ignoreDuringBuilds: true` | Hệ thống thi cần build bắt lỗi kiểu; bật lại kiểm tra |
| Không CI/CD, push thẳng `main` | Cần nhánh + CI chạy test exam engine trước khi deploy ([08 §4](08-ke-hoach-nghiem-thu.md#4-definition-of-done)) |
| Hai file schema MSSQL/Postgres | Xem mục 6 |
| Seed user mặc định với mật khẩu cố định | Dùng `scripts/create-user.ts` cho admin đầu tiên; bắt đổi mật khẩu |
| Groq / RAG / LanceDB | Không thuộc phạm vi |
