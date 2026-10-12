# 08 — Kế hoạch triển khai, ngân sách, nghiệm thu

## 1. Lộ trình 12 tuần

| Tuần | Công việc | Bàn giao | Tài liệu liên quan |
|---|---|---|---|
| 1–2 | Workshop nghiệp vụ, wireframe, chốt quy tắc thi và acceptance criteria; trả lời danh sách `CẦN CHỐT` | SRS, wireframe, backlog, test plan | [09](09-cau-hoi-mo-rui-ro.md), [03](03-giao-dien.md) |
| 3–4 | Dựng project Next.js theo khung TrackMyGoal, CI, Prisma migrate, NextAuth + guard 2 vai trò, môi trường staging | Skeleton chạy được, migration, pipeline | [10](10-cong-nghe.md), [04](04-co-so-du-lieu.md), [06](06-bao-mat.md) |
| 5–6 | Import đại lý, khóa học, tài liệu, lịch Meet, ngân hàng câu hỏi | Các module quản trị và nội dung | [05](05-api.md) |
| 7–8 | Ôn tập, exam engine, autosave, submit, chấm điểm, luật 1 lượt | Luồng thi đầu-cuối | [02](02-quy-tac-thi.md) |
| 9 | Báo cáo, export, audit, hardening, backup | MVP feature complete | |
| 10 | Load test 100 → 1.000, profiling, tối ưu | Báo cáo tải vòng 1 | [07](07-kiem-thu-tai.md) |
| 11 | Sửa bottleneck, test lại, security review, UAT | Báo cáo tải cuối, UAT sign-off | |
| 12 | Pilot, đào tạo admin, release production | Runbook, hướng dẫn, checklist go-live | |

### Thứ tự build đề xuất trong tuần 3–8

Ưu tiên luồng rủi ro cao sớm để có thời gian load test:

1. Auth + RBAC + `/me` + layout 2 vai trò.
2. CRUD đại lý tối thiểu + seed dữ liệu test (cần cho mọi thứ khác).
3. Ngân hàng câu hỏi (đủ để tạo đề 30 câu).
4. **Exam engine** (bắt đầu, autosave, submit, hết giờ, chấm điểm) — viết integration test song song.
5. Chạy thử k6 nhỏ (50–100 VU) ngay cuối tuần 6, không đợi tuần 10.
6. Khóa học, tài liệu, lịch Meet, ôn tập.
7. Import Excel, báo cáo, export, audit log UI.

## 2. Ngân sách dự toán (triệu VNĐ)

| Hạng mục | Khoảng |
|---|---|
| Phân tích nghiệp vụ và UI/UX | 10–18 |
| Frontend | 18–30 |
| Backend / auth / RBAC | 18–30 |
| Khóa học, Google Meet, import Excel | 10–18 |
| Question bank, ôn tập và thi | 25–40 |
| Báo cáo, audit và export | 8–15 |
| DevOps, bảo mật, backup, monitoring | 8–15 |
| QA và load testing | 12–25 |
| UAT, tài liệu và triển khai | 5–10 |
| **Tổng trước dự phòng** | **114–201** |
| Dự phòng ~10% | 11–20 |
| **Tổng dự kiến** | **125–221** |

Vận hành tham khảo: 4–12,5 triệu VNĐ/tháng (chưa gồm Google Workspace, nhân sự vận hành, VAT, chi phí theo lưu lượng). Không phải cam kết hiệu năng; cần báo giá theo cloud/region thật.

## 3. Tiêu chí nghiệm thu chức năng

| Module | Tiêu chí |
|---|---|
| Import Excel | Preview, lỗi theo dòng, xác nhận import, không tạo trùng dealer ngoài quy tắc đã chốt |
| Ôn tập | Luyện nhiều lần; kết quả và giải thích đúng policy |
| Thi chính thức | Đúng 30 câu, 45 phút, tối đa 1 lượt; luật 1 lượt enforce ở backend/DB |
| Autosave | Xác nhận lưu; retry không tạo câu trả lời trùng; khôi phục cùng attempt khi còn thời gian |
| Hết giờ / nộp | Attempt được khóa và chấm **một lần**; điểm trong báo cáo khớp dữ liệu câu trả lời |
| Phân quyền | Dealer không đọc được dữ liệu dealer khác; đáp án không lộ trong payload thi |
| Meeting | Link Google Meet và lịch hiển thị đúng; quy trình điểm danh được mô tả |
| Tải | Hoàn thành test 1.000 VU theo ngưỡng chủ dự án phê duyệt; bàn giao kết quả đo |
| Vận hành | Backup/restore đã thử; có dashboard cảnh báo và runbook sự cố |

### Bộ test tự động tối thiểu cho exam engine

| Test | Kỳ vọng |
|---|---|
| 2 request bắt đầu thi đồng thời cùng dealer | Đúng 1 attempt, cả 2 response trả cùng `attemptId` |
| Bắt đầu thi lần 2 sau khi đã nộp | 409 `ATTEMPT_ALREADY_USED` |
| Login lại giữa bài | Cùng `attemptId`, `deadlineAtUtc` không đổi |
| Lưu đáp án với `clientSeq` 5 rồi 4 | Giá trị của seq 5 được giữ |
| Lưu cùng `clientSeq` 2 lần | 1 dòng, không lỗi |
| Lưu sau deadline + grace | 409 `ATTEMPT_CLOSED` |
| `selectedOptionId` của câu khác | 422 `INVALID_OPTION` |
| Submit 2 lần | Lần 2 trả cùng kết quả, không chấm lại |
| Submit đồng thời với worker hết giờ | Chỉ 1 lần chấm; trạng thái cuối nhất quán |
| Admin sửa câu hỏi khi attempt đang làm | Attempt vẫn dùng snapshot cũ, chấm theo snapshot |
| Dealer A đọc attempt của dealer B | 404 |
| Payload thi | Không chứa `isCorrect` / `correctOptionId` / `explanation` |
| Kỳ thi < 30 câu Published | Không publish được (EX-01) |
| Cấp lại lượt không có lý do | 422; có lý do → attempt cũ `Voided` + 1 audit log |

## 4. Definition of Done

Một hạng mục chỉ hoàn thành khi:

- Có code review.
- Có unit/integration test phù hợp.
- Đã kiểm tra phân quyền.
- Có log/metrics cần thiết.
- Tài liệu API được cập nhật.
- Chạy qua CI.
- QA xác nhận.

**Go-live** chỉ được duyệt khi: UAT đạt, kiểm thử tải đạt ngưỡng đã ký, backup/restore đã thử, có người chịu trách nhiệm vận hành.

## 5. Checklist go-live

- [ ] Ngưỡng hiệu năng đã được chủ dự án ký
- [ ] Báo cáo tải cuối đạt + 4 truy vấn kiểm tra dữ liệu trả 0 dòng
- [ ] Backup tự động + đã restore thử thành công
- [ ] Dashboard cảnh báo: 5xx, p95, CPU DB, connection pool, attempt `InProgress` quá hạn
- [ ] Runbook: kỳ thi bị gián đoạn, cấp lại lượt hàng loạt, rollback bản build
- [ ] Secrets ở secret manager; không có secret trong repo
- [ ] Tài khoản admin thật đã tạo; tài khoản test đã xóa khỏi production
- [ ] Import danh sách đại lý thật, gửi thông tin đăng nhập
- [ ] Pilot với nhóm đại lý nhỏ trước kỳ thi lớn đầu tiên
- [ ] Tài liệu hướng dẫn cho admin và đại lý

## 6. Trạng thái kiểm thử (2026-10-12)

| Lệnh | Nội dung | Kết quả |
|---|---|---|
| `npm test` | 28 unit test: chấm điểm, deadline, policy, trạng thái nút kỳ thi, slotKey, bốc đề, snapshot, parse/validate import, chống formula injection | ✅ 28/28 |
| Smoke test HTTP (luồng thi) | 18 kiểm tra trong bảng "Bộ test tự động tối thiểu" mục 3: bắt đầu đồng thời, seq ngược thứ tự, idempotent, option sai câu, khôi phục, submit đồng thời, lưu sau nộp, lượt 2 | ✅ 18/18 |
| `npm run test:e2e` | Playwright, 16 kịch bản trên trình duyệt thật (7 đại lý, 7 quản trị, 2 tab Tài liệu khóa học — có kiểm tra không phát sinh lỗi console): đăng nhập, phân quyền, khóa học, luyện tập, làm bài + F5 + nộp, kết quả, thêm đại lý + buộc đổi mật khẩu, import CSV, câu hỏi, kỳ thi + chặn EX-01, báo cáo + cấp lại lượt + audit + export | ✅ 14/14 + 2/2 (`e2e/materials.spec.ts`) + 2/2 (`e2e/course-visibility.spec.ts`: khóa học bản nháp bị ẩn với đại lý, xuất bản xong thấy cả khóa học và lịch training) |
| `e2e/notifications.spec.ts` | Chuông thông báo: admin xuất bản khóa học → đại lý thấy số chưa đọc, mở đúng trang, đánh dấu đã đọc, trang Xem tất cả; sửa lịch → thông báo thay đổi; admin nhận nhắc buổi sắp bắt đầu → mở trang điểm danh; phòng thi không có chuông | ✅ 4/4 |
| `e2e/attendance.spec.ts`, `e2e/meet-join.spec.ts` | Điểm danh (đếm + danh sách đã/chưa tham gia, lọc, xuất Excel); vào Google Meet và trạng thái buổi theo giờ thực | ✅ 3/3 |
| `e2e/ranking.spec.ts` + `lib/ranking.test.ts` | Xếp hạng: thứ tự theo điểm → thời gian, đồng hạng, bỏ lượt đã hủy, lọc khu vực, xuất Excel; đại lý xem hạng mình + top 10 khi công khai / chỉ hạng mình khi tắt; không thi hoặc chưa kết thúc thì chưa xem | ✅ 3/3 e2e + 5/5 unit |
| `e2e/question-import.spec.ts` + `lib/import/question-import.test.ts` | Import câu hỏi: tải file mẫu đúng cột, điền + upload, chủ đề mới, lỗi theo dòng (đáp án đúng trỏ ô trống, trùng trong file), tải file lỗi, xuất bản ngay, chặn upload lại câu đã có, thiếu cột | ✅ 2/2 e2e + 7/7 unit |
| `e2e/pagination.spec.ts` + `lib/pagination.test.ts` | Phân trang: mặc định 10, đổi 20/50, chuyển trang, giữ bộ lọc, trang vượt quá về trang cuối, ẩn nút khi 1 trang; bảng xem trước import phân trang phía client; bảng phía đại lý | ✅ 3/3 e2e + 4/4 unit |
| `loadtest/check-data.sql` | 4 truy vấn toàn vẹn dữ liệu | ✅ 0 dòng lỗi |
| `npm run build`, `npm run lint`, `npm run type-check` | | ✅ |
| k6 1.000 VU | | ⏳ chưa chạy (cần cài k6, chạy trên bản build production) |

Chưa có test tự động cho: submit đồng thời với cron hết giờ, sửa câu hỏi khi đang có lượt làm bài (đã đúng theo thiết kế snapshot nhưng chưa có test riêng).
