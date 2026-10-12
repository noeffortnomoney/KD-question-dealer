# Kymdan Dealer Training & Examination Portal — Project Brain

Website đào tạo và thi cho đại lý Kymdan: khóa học, tài liệu, lịch Google Meet, ôn tập, thi chính thức 30 câu / 45 phút / 1 lượt, báo cáo. Đúng **2 vai trò**: `admin` (Quản trị viên) và `dealer` (Đại lý). Mục tiêu tải: 1.000 người thi đồng thời.

Giao tiếp với user bằng **tiếng Việt**.

## Tài liệu (Docs/) — nguồn chân lý nghiệp vụ

| File | Đọc khi |
|---|---|
| @Docs/README.md | Mục lục, thông số đã chốt |
| `Docs/01-tong-quan-pham-vi.md` | Phạm vi MVP, vai trò, luồng nghiệp vụ, kiến trúc |
| `Docs/02-quy-tac-thi.md` | **Bắt buộc đọc trước khi sửa `lib/exam/*`** — EX-01…12, vòng đời attempt, autosave, chấm điểm, cấp lại lượt |
| `Docs/03-giao-dien.md` | UI-01…25, route, trạng thái nút kỳ thi, design token |
| `Docs/04-co-so-du-lieu.md` | Đặc tả DB gốc + lỗ hổng của `schema.sql`; mục "Hiện thực" ghi khác biệt với `prisma/schema.prisma` |
| `Docs/05-api.md` | Endpoint, mã lỗi, hợp đồng JSON luồng thi |
| `Docs/06-bao-mat.md` | Auth, guard, chống lộ đáp án, rate limit, audit |
| `Docs/07-kiem-thu-tai.md` | k6 (script ở `loadtest/k6/`), truy vấn kiểm tra dữ liệu |
| `Docs/08-ke-hoach-nghiem-thu.md` | Lộ trình, bộ test bắt buộc, Definition of Done |
| `Docs/09-cau-hoi-mo-rui-ro.md` | Câu hỏi `CẦN CHỐT` (đang dùng phương án "Đề xuất"), mâu thuẫn, rủi ro |
| `Docs/10-cong-nghe.md` | Stack, cấu trúc thư mục, pattern auth/guard, Server Action vs Route Handler |

### Quy tắc giữ tài liệu đồng bộ với code

| Khi sửa | Cập nhật |
|---|---|
| `prisma/schema.prisma` | `Docs/04` mục "Hiện thực" |
| `lib/exam/*` (luật thi) | `Docs/02` + bộ test `lib/exam/*.test.ts` |
| Route Handler mới / đổi JSON | `Docs/05` |
| Route trang mới / đổi menu | `Docs/03` mục 1–2 và bảng "Map route" bên dưới |
| Chốt một mục `CẦN CHỐT` | `Docs/09` (ghi quyết định + ngày) và file tài liệu liên quan |
| Đổi stack / hosting | `Docs/10` + mục Stack bên dưới |

Mọi thay đổi lớn ghi vào bảng "Lịch sử thay đổi" cuối file này.

## Stack (theo project TrackMyGoal của user)

Next.js 15 App Router · TypeScript · React 19 · Tailwind v4 · shadcn/ui (new-york, `radix-ui`) · lucide-react · sonner · recharts · Prisma 6 · NextAuth v5 (Credentials, JWT) · bcryptjs · zod · date-fns · exceljs · Vitest

- **DB hiện tại:** SQL Server local (`MSSQLSERVER`, integrated security), DB `KymdanDealerPortal`.
- **Deploy (để sau):** Vercel + Neon Postgres. Code **không** dùng tính năng riêng của SQL Server (không raw SQL, không filtered index) để đổi provider chỉ cần sửa `schema.prisma`.
- Không dùng `xlsx@0.18.5` (lỗ hổng khi đọc file upload) → dùng `exceljs`.

## Lệnh thường dùng

```bash
npm run dev              # :3000 — chế độ dev: lần đầu mở mỗi trang 1–5 s (biên dịch), sau đó ~150–400 ms
npm run dev:turbo        # dev với Turbopack (biên dịch lần đầu nhanh hơn)
npm run preview          # build + chạy bản production ở :3001 (thư mục .next-prod, chạy song song được với dev) — ~15–50 ms/trang, dùng để demo/dùng thử
npm run db:push          # sync schema.prisma -> SQL Server (dev)
npm run db:generate      # sau khi sửa schema.prisma
npm run db:seed          # XÓA SẠCH DB rồi tạo dữ liệu demo (admin, 5 đại lý, 40 câu hỏi, 3 kỳ thi, 3 khóa học)
npm run db:studio        # :5555
npm run user:create -- "<tên>" <email> <password>        # tạo quản trị viên
npm run loadtest:seed -- 1000 <examId>                   # tài khoản loadtest-{n}@example.test
npm test                 # vitest (unit)
npm run test:e2e         # seed lại DB + Playwright, MỞ trình duyệt thật để xem trực tiếp
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:ci      # headless
npm run test:e2e:report  # mở báo cáo HTML lần chạy gần nhất
npm run type-check
npm run lint
npm run build
```

Tài khoản seed: `admin@kymdan.local` / mật khẩu lấy từ `SEED_ADMIN_PASSWORD` trong `.env.local` (mặc định `Admin@123`), `dealer01@kymdan.local` … `dealer05@kymdan.local` / `Dealer@123`. Test Playwright đăng nhập admin bằng cùng biến này — **không ghi mật khẩu thật vào code**.

### Quy tắc kiểm thử

- Test giao diện **chỉ dùng Playwright** (`e2e/*.spec.ts`), đọc kết quả dạng chữ. **Không** dùng Claude in Chrome / computer use / chụp màn hình để Claude xem (tốn token). Cần xem lỗi → đọc `test-results/**/error-context.md`.
- `npm run test:e2e` chạy `db:seed` trước → mất dữ liệu đang có trong DB dev. Muốn giữ dữ liệu user thì chạy riêng spec không phụ thuộc seed: `npx playwright test e2e/materials.spec.ts e2e/course-visibility.spec.ts`.
- Spec tạo dữ liệu phải đặt tên bắt đầu bằng `E2E ` hoặc `Khóa test ` và dọn trong `afterAll` bằng `cleanupTestCourses()` (`e2e/db.ts`).
- `next build` ghi đè `.next` của dev server → dừng `npm run dev` trước khi build.
- Mọi thay đổi ở `lib/exam/*` phải chạy lại `npm test` + `npm run test:e2e` + `loadtest/check-data.sql`.

## Map thư mục

| Đường dẫn | Vai trò |
|---|---|
| `app/(auth)/login`, `app/(auth)/change-password` | Đăng nhập, đổi mật khẩu bắt buộc |
| `app/(dealer)/` | UI đại lý (sidebar đại lý) |
| `app/(exam)/attempts/[attemptId]` | Phòng thi + kết quả (layout tối giản) |
| `app/admin/` | UI quản trị (sidebar admin), URL có tiền tố `/admin` |
| `app/api/` | Route Handlers: luồng thi, ôn tập, import/export, tải tài liệu, cron |
| `lib/auth.ts` · `lib/auth.config.ts` | NextAuth (Node) · callbacks JWT (Edge-safe) |
| `lib/roles.ts` | `UserRole`, `homePathFor`, `canAccessPath` — Edge-safe |
| `lib/auth-guard.ts` | `requireUser` / `requireAdmin` / `requireDealer` / `requireActiveDealer` |
| `lib/exam/` | Exam engine: `engine.ts`, `grading.ts`, `policy.ts`, `snapshot.ts`, `select.ts` |
| `lib/practice.ts` | Ôn tập |
| `lib/actions/` | Server Actions quản trị và hồ sơ |
| `lib/import/` | Parse + validate file import đại lý (`dealer-import.ts`) và câu hỏi (`question-import.ts` thuần + `question-import-server.ts` đối chiếu DB) |
| `lib/audit.ts` · `lib/http.ts` · `lib/ids.ts` | Ghi audit · helper JSON lỗi Route Handler · so sánh ID |
| `components/exam/` | Phòng thi: câu hỏi, lưới, đồng hồ, chỉ báo lưu, popup nộp bài |
| `prisma/schema.prisma` | Nguồn chân lý DB |
| `lib/actions/admin/` | Server Actions quản trị: dealers, questions, exams, courses, attempts (chi tiết + cấp lại lượt), users |
| `lib/reports.ts` · `lib/admin-stats.ts` | Số liệu báo cáo kỳ thi (dùng chung cho trang và file export) · dashboard admin |
| `lib/assign.ts` | Giao kỳ thi / khóa học: tất cả, theo khu vực, theo danh sách mã |
| `components/admin/` · `components/common/` | UI quản trị · component dùng chung (ConfirmAction = UI-24, FilterBar, Pagination, StatusBadge…) |
| `prisma/seed.ts` · `scripts/` | Seed, tạo admin, seed loadtest |
| `e2e/` | Playwright |
| `loadtest/` | k6 (`k6/exam_steady.js`), `check-data.sql` (4 truy vấn toàn vẹn dữ liệu, phải trả 0 dòng) |

### Map route

| Đại lý | Admin |
|---|---|
| `/dashboard` (UI-02) | `/admin` (UI-09) |
| `/courses`, `/courses/[id]` (UI-03) | `/admin/dealers` (UI-10/11), `/admin/dealers/import` (UI-12) |
| `/training-sessions` | `/admin/courses`, `/admin/courses/[id]?tab=info\|materials\|sessions\|dealers` (UI-13/14/15), `/admin/training-sessions`, `/admin/training-sessions/[sessionId]` (điểm danh) |
| `/practice`, `/practice/[sessionId]` (UI-04) | `/admin/questions`, `/admin/questions/[id]` (UI-16/17), `/admin/questions/import` (UI-28) |
| `/exams`, `/exams/[examId]` (UI-05), `/exams/[examId]/ranking` (UI-27) | `/admin/exams`, `/admin/exams/[id]?tab=config\|questions\|dealers\|ranking` (UI-18/19/27) |
| `/attempts/[id]` (UI-06/07), `/attempts/[id]/result` (UI-08) | `/admin/reports` (UI-20/21/22) |
| `/my-results` | `/admin/audit-logs` (UI-23), `/admin/settings` |
| `/notifications` (dùng chung) | `/notifications` (dùng chung) |

## Quy tắc bất biến

- **Không viết comment trong code** (quy ước chung của user). Giải thích đưa vào `Docs/`.
- **Guard ở mọi nơi**: middleware chỉ chặn trang. Route Handler và Server Action **không** đi qua middleware → mọi file `app/api/**/route.ts` và mọi hàm trong `lib/actions/*` phải tự gọi guard.
- Guard trả object tươi: `const g = await requireAdmin(); if ("error" in g) return { error: g.error };` (không `return g`).
- `dealerId` / `userId` **luôn lấy từ session**, không bao giờ từ body/query.
- **Luồng thi và ôn tập dùng Route Handler**, không dùng Server Action (action từ một client chạy tuần tự → autosave nghẽn; ID action đổi mỗi build → k6 không gọi được).
- Server Action trả `{ success: true, ... }` hoặc `{ error: "..." }`, không throw. Thứ tự: guard → zod `safeParse` → `prisma.$transaction` → `writeAudit` → `revalidatePath`.
- Route Handler lỗi trả `{ error, code }` + HTTP status (bảng mã lỗi ở `Docs/05`). Dùng `lib/http.ts`.
- **Không bao giờ** trả `passwordHash`, `isCorrect`, `correctOptionId`, `explanation` trong payload thi. Payload thi đi qua `toExamQuestionDto()` trong `lib/exam/snapshot.ts`.
- Chấm điểm **chỉ** từ `AttemptQuestion.snapshot`, không đọc lại `QuestionOption`.
- Đổi trạng thái attempt **chỉ** qua `finalizeAttempt()` (điều kiện `status = InProgress` → chấm đúng một lần).
- Thời gian: lưu UTC (`DateTime` của Prisma), hiển thị `Asia/Ho_Chi_Minh` qua `lib/date-utils.ts`. Đồng hồ thi dùng `serverNow` + `deadlineAt` từ server.
- So sánh ID luôn qua `sameId()` (SQL Server trả GUID có thể khác hoa/thường).
- Không dùng `prisma.$queryRaw` / SQL riêng của SQL Server.
- Không filter dữ liệu ở client — filter ở query.
- **Mọi bảng danh sách phải phân trang** bằng `<Pagination>` (`components/common/Pagination.tsx`) + `lib/pagination.ts`: `parsePageSize(sp.size)` (10/20/50/100, mặc định 10), `parsePage(sp.page)`, `clampPage`. Danh sách lấy từ DB lớn → `count` rồi `skip/take`; danh sách đã tính trong bộ nhớ → `paginate()`. Bảng phía client (xem trước import) → `<Pagination onChange>`. Cột STT dùng `offset + i + 1`. Export file không phân trang.
- Không import Toaster trực tiếp trong Server Component (đã có trong `components/Providers.tsx`).

## Luật thi (tóm tắt — chi tiết `Docs/02`)

```
Một lượt chính thức   = ExamAttempt.slotKey UNIQUE
                        slotKey = "<examId>:<dealerId>" (chữ thường) khi lượt còn hiệu lực
                        khi cấp lại lượt: status = Voided, slotKey = "<examId>:<dealerId>:void:<attemptId>"
Bắt đầu thi           = có attempt InProgress còn hạn -> trả lại attempt đó (200); đã Submitted/Expired -> 409
Deadline              = min(startedAt + durationMinutes, exam.endsAt)
Grace                 = EXAM_GRACE_SECONDS (mặc định 10s) cho autosave/submit sát giờ
Autosave              = PUT answer { selectedOptionId, clientSeq }; chỉ ghi khi clientSeq > version
Nộp / hết giờ         = finalizeAttempt(id, "Submitted" | "Expired") -> grade 1 lần
Hết giờ               = lazy check ở mọi request chạm attempt + cron /api/cron/expire-attempts
scorePercent          = round2(correct / total * 100); isPassed = scorePercent >= passMarkPercent
Đề                    = ExamQuestion là "pool"; selectionMode fixed lấy questionCount câu đầu theo sortOrder,
                        random bốc ngẫu nhiên questionCount câu; shuffleOptions trộn lựa chọn
Ôn tập                = không dùng ExamAttempt; loại câu đang nằm trong kỳ thi official còn mở
Hiển thị cho đại lý   = khóa học phải published + đại lý được giao (lịch training ẩn theo khóa học);
                        kỳ thi phải published/closed + được giao. Bản nháp có banner HiddenFromDealersBanner ở trang admin
Lịch training         = trạng thái hiển thị tính theo giờ thực: sessionPhase() trong lib/session-status.ts
                        (Sắp diễn ra / Đang diễn ra / Đã diễn ra / Đã hủy) — KHÔNG hiển thị thẳng cột status trong DB.
                        Nút "Tham gia" là <a target=_blank> tới link Meet, chỉ render khi canJoinSession()
                        (mở trước 15 phút → hết giờ); điểm danh gọi joinSessionAction song song, không chặn việc mở Meet
Thông báo (chuông)    = lib/notifications.ts. Bảng notifications, UNIQUE (userId, dedupeKey) — luôn gửi qua notifyUsers /
                        notifyDealers / notifyAdmins với dedupeKey ổn định (vd "course:<id>", "exam-open:<id>"); sự kiện lặp
                        được (sửa lịch) thêm Date.now() vào key. Bọc trong notifySafely() để lỗi thông báo không làm hỏng thao tác.
                        Sự kiện → đại lý: xuất bản/giao khóa học, thêm/sửa/hủy/khôi phục lịch (khóa đã xuất bản), mở/giao kỳ thi,
                        đóng kỳ thi có policy after_exam_ends (kết quả/đáp án), cấp lại lượt.
                        Nhắc việc sinh khi GET /api/notifications (ensureReminders): đại lý — buổi training ≤ 60 phút/đang diễn ra
                        mà chưa bấm tham gia, kỳ thi đóng trong 24h chưa làm, bài đang làm dở; admin — buổi sắp/đang diễn ra
                        (link điểm danh), kỳ thi hết hạn chưa đóng, kỳ thi thiếu câu, lượt thi treo.
                        Chuông nằm trong AppShell (không có trong layout phòng thi). Trang /notifications dùng chung 2 vai trò.
Xếp hạng              = lib/ranking.ts (rankRows thuần, có test). Chỉ lượt Submitted/Expired, bỏ Voided. Điểm cao → thời gian
                        làm ngắn → đồng hạng. Admin: tab ?tab=ranking ở /admin/exams/[id] (mọi lúc, lọc khu vực, Excel).
                        Đại lý: /exams/[examId]/ranking chỉ khi kỳ thi kết thúc + showScorePolicy cho phép + có bài; luôn thấy
                        hạng mình, top 10 chỉ khi exams.showLeaderboard = true (mặc định false — Docs/01: chỉ xem dữ liệu của mình)
Điểm danh             = "Đã tham gia" = đại lý đã bấm nút Tham gia (attendances.source = 'click', joined_at).
                        User dùng Google Meet MIỄN PHÍ → không có báo cáo/API điểm danh của Google, không biết ai ở lại
                        bao lâu. Admin xem ở /admin/training-sessions/[sessionId] (lọc, tự cập nhật 30s khi đang họp, xuất Excel)
```

### Giá trị trạng thái

| Cột | Giá trị |
|---|---|
| `User.role` | `admin` · `dealer` |
| `User.status`, `Dealer.status` | `active` · `locked` |
| `Course.status`, `Question.status` | `draft` · `published` · `archived` |
| `Exam.status` | `draft` · `published` · `closed` · `archived` |
| `Exam.selectionMode` | `fixed` · `random` |
| `Exam.showScorePolicy`, `showAnswerPolicy` | `after_submit` · `after_exam_ends` · `never` |
| `ExamAttempt.status` | `InProgress` · `Submitted` · `Expired` · `Voided` |
| `TrainingSession.status` | `scheduled` · `cancelled` · `completed` |
| `ImportJob.status` | `previewed` · `committed` · `expired` |

## Env (.env.local)

```
DATABASE_URL="sqlserver://localhost:1433;database=KymdanDealerPortal;integratedSecurity=true;trustServerCertificate=true"
AUTH_SECRET="..."
AUTH_TRUST_HOST=true
CRON_SECRET="..."
EXAM_GRACE_SECONDS=10
STORAGE_DIR="./storage"
SEED_ADMIN_PASSWORD="..."      # mật khẩu admin khi seed + khi Playwright đăng nhập admin
```

`.env.local` phải lưu **UTF-8 không BOM** (PowerShell 5.1 `Set-Content -Encoding utf8` chèn BOM → dotenv đọc sai biến đầu tiên).
Sửa `schema.prisma` khi đang chạy `npm run dev` / `npm run preview`: `prisma generate` bị `EPERM` trên Windows → phải tắt server trước.

## Chưa làm (backlog)

- Quên mật khẩu / đặt lại qua email (chưa có dịch vụ email — Q7). Hiện admin cấp mật khẩu tạm.
- Rate limit (Docs/06 §4). Hiện chỉ có khóa tài khoản sau 5 lần sai.
- CSP header; `DENY UPDATE/DELETE` trên `audit_logs` ở DB production.
- Chạy k6 1.000 VU thật (cần cài k6, chạy trên `npm run build && npm start`).
- Chuyển Vercel + Neon (Docs/10 §6): đổi provider Prisma, `lib/storage.ts` → Vercel Blob, `vercel.json` cron mỗi phút.
- Điểm danh tự động từ Google Meet (Q8); thông báo email lịch học/kỳ thi.
- Các mục `CẦN CHỐT` ở Docs/09 đang chạy theo phương án "Đề xuất" — chờ chủ dự án xác nhận.

## Không làm

- Không dùng `prisma db push --accept-data-loss` trên DB có dữ liệu thật.
- Không thêm vai trò thứ 3 (trainer/auditor…). Người trình bày Meet chỉ là `TrainingSession.presenterName`.
- Không `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds` (khác TrackMyGoal).
- Không lưu file tải lên vào `public/` — dùng `STORAGE_DIR` và tải qua Route Handler có guard.
- Không chạy load test vào production.

## Lịch sử thay đổi

| Ngày | Thay đổi | Lý do |
|---|---|---|
| 2026-10-12 | Tạo bộ tài liệu `Docs/` 01–10 từ gói bàn giao v1.1 | Chuẩn hóa đặc tả |
| 2026-10-12 | Chọn stack TrackMyGoal thay ASP.NET Core; dev SQL Server local, Vercel + Neon để sau | Quyết định của user |
| 2026-10-12 | Luật 1 lượt dùng `slotKey @unique` thay filtered unique index | Prisma biểu diễn được, chạy cả SQL Server lẫn Postgres, `db push` không xóa mất |
| 2026-10-12 | Code MVP: luồng thi, ôn tập, khóa học/Meet, toàn bộ trang quản trị, import/export, báo cáo, cấp lại lượt, audit, dashboard | Yêu cầu của user |
| 2026-10-12 | Lưu đáp án khóa dòng attempt (`lastActivityAt`) trong transaction | Tuần tự hóa lưu và nộp bài, không cần bắt `P2002` trong transaction (Postgres sẽ hủy transaction) |
| 2026-10-12 | Test giao diện bằng Playwright chạy có giao diện | User yêu cầu, không tốn token |
