# 07 — Kiểm thử tải (k6)

Mục tiêu nghiệm thu: **1.000 người thi đồng thời theo hành vi thực tế**, không phải 1.000 request/giây. Chỉ chạy trên **staging riêng**; không chạy production khi chưa được duyệt.

## 1. Ước lượng tải thực tế

| Thời điểm | Hành vi | Tốc độ ước lượng |
|---|---|---|
| Trước giờ thi (kỳ thi giờ cố định) | 1.000 login + 1.000 tạo attempt trong ~2–5 phút | 3–8 login/s, 3–8 tạo attempt/s; **mỗi attempt insert 31 dòng** |
| Trong giờ thi | 30 câu / ~35 phút, ~1,2 lần lưu mỗi câu | ~15–20 lần lưu/s toàn hệ thống |
| Cuối giờ | Phần lớn nộp trong 1–3 phút cuối, phần còn lại hết giờ | 5–17 submit/s + worker xử lý `Expired` |

Kết luận: tải **ghi** ở mức vài chục request/giây, nằm trong khả năng của một database cỡ vừa nếu index đúng. Điểm nghẽn thực sự thường nằm ở: `bcryptjs` khi login đồng loạt, số connection DB (đặc biệt khi serverless mở nhiều instance), lock khi tạo attempt hàng loạt, và job chấm điểm lúc hết giờ.

## 2. Các kịch bản

| Kịch bản | Mô tả | Điều kiện đạt (đề xuất, `CẦN CHỐT` với chủ dự án) |
|---|---|---|
| Load ramp | 100 → 300 → 500 → 800 → 1.000 VU | Không có lỗi nghiêm trọng; xác định ngưỡng bắt đầu suy giảm |
| Steady state | 1.000 VU trong 30 phút, nhịp thực tế | API thường p95 < 2s; lỗi server < 0,1% |
| Save storm | 1.000 VU lưu đáp án liên tục với think time ngắn (1–3s) **trong cùng attempt** | Lưu p95 < 1s; không mất / không trùng câu trả lời |
| Submit spike | Mọi VU nộp trong cửa sổ ~60 giây | Submit p95 < 3s; nộp idempotent; điểm chính xác |
| Expiry | VU không nộp, để hết giờ (dùng kỳ thi staging 5 phút) | Mọi attempt chuyển `Expired` trong ≤ grace + chu kỳ worker; điểm đúng |
| Recovery | Ngắt mạng ngắn / login lại giữa bài | Cùng AttemptId; deadline không reset; đáp án đã lưu còn nguyên |
| Soak | Giữ tải 30–60 phút | Không tăng bộ nhớ liên tục; connection pool không cạn kéo dài |

## 3. Lỗi trong script mẫu `k6_exam_load_test.js`

| # | Mức | Vấn đề | Hậu quả |
|---|---|---|---|
| 1 | **Nghiêm trọng** | Mỗi VU dùng **một tài khoản cố định** (`loadtest-${__VU}`) nhưng lặp lại kịch bản nhiều lần (ramping-vus lặp iteration). Một bài thi với think time 1–3s chỉ mất ~60s → mỗi VU chạy ~30+ iteration trong 30 phút | Từ iteration thứ 2, API **đúng nghiệp vụ** trả 409 `ATTEMPT_ALREADY_USED` → `http_req_failed` vượt ngưỡng ngay lập tức; bài test luôn fail hoặc buộc dev nới luật 1 lượt |
| 2 | **Nghiêm trọng** | Chọn đáp án qua `q.testOptionId` | Ngụ ý API trả thông tin đáp án xuống client — vi phạm EX-08. Phải chọn ngẫu nhiên từ `q.options` |
| 3 | Cao | Think time 1–3s/câu gộp chung với kịch bản "hành vi thực tế" | Tải gấp ~30 lần thực tế nhưng vẫn gọi là "steady state" → kết quả không phản ánh nghiệm thu. Tách thành Steady state (nhịp thực) và Save storm (nhịp dày) |
| 4 | Cao | Thiếu bước "đọc câu hỏi" (`GET /attempts/{id}`) và "xem kết quả" (`GET /result`) mà spec mục 9 yêu cầu | Kịch bản không đủ phạm vi nghiệm thu |
| 5 | Cao | Thiếu ngưỡng riêng cho submit (spec: p95 < 3s) và cho `business_errors` | Metric được ghi nhưng không bao giờ làm fail test |
| 6 | Trung bình | `version: q.version \|\| 1` gửi giá trị không đổi | Không kiểm tra được chống ghi đè ngược thứ tự; dùng `clientSeq` tăng dần (xem [02 §5](02-quy-tac-thi.md#5-autosave--put-apiattemptsattemptidanswersattemptquestionid)) |
| 7 | Thấp | Đo latency bằng `Date.now()` | Dùng `res.timings.duration` chính xác hơn |
| 8 | Thấp | Kết quả `available exams` không cộng vào `business_errors` | Lỗi bị bỏ sót |
| 9 | Cao | Gọi `POST /api/auth/login` và lấy `accessToken` | Stack dùng NextAuth (session cookie, không có Bearer) → phải đi luồng `GET /api/auth/csrf` → `POST /api/auth/callback/credentials`; cookie jar của k6 tự giữ session cho từng VU |

## 4. Script đã sửa (kịch bản Steady state)

Bản chạy được nằm ở `loadtest/k6/exam_steady.js` (hướng dẫn trong `loadtest/README.md`), đã khớp với API thật: đăng nhập NextAuth, `optionId`, `clientSeq`, tham số `MAX_VUS` / `STEADY` / `THINK_MIN` / `THINK_MAX`. Dữ liệu test tạo bằng `npm run loadtest:seed -- 1000 <examId>`. Đoạn dưới đây là bản giải thích. **Chưa chạy k6 thật** — máy dev chưa cài k6.

Yêu cầu dữ liệu staging: ≥ 1.000 tài khoản `loadtest-{n}@example.test` (n = 1…1000), cùng mật khẩu, đã được giao `EXAM_ID`, chưa có attempt. Reset dữ liệu attempt giữa các lần chạy bằng script SQL riêng trên staging.

```js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL;
const EXAM_ID = __ENV.EXAM_ID;
const PASSWORD = __ENV.TEST_PASSWORD;
const THINK_MIN = Number(__ENV.THINK_MIN || 40);
const THINK_MAX = Number(__ENV.THINK_MAX || 80);
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const businessErrors = new Rate('business_errors');
const saveLatency = new Trend('answer_save_latency', true);
const submitLatency = new Trend('submit_latency', true);
const questionsAnswered = new Counter('questions_answered');
const attemptsSubmitted = new Counter('attempts_submitted');

export const options = {
  scenarios: {
    exam_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '3m', target: 500 },
        { duration: '3m', target: 800 },
        { duration: '3m', target: 1000 },
        { duration: '30m', target: 1000 },
        { duration: '3m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.001'],
    'http_req_duration{step:login}': ['p(95)<2000'],
    'http_req_duration{step:available_exams}': ['p(95)<2000'],
    'http_req_duration{step:start_attempt}': ['p(95)<2000'],
    'http_req_duration{step:get_attempt}': ['p(95)<2000'],
    'http_req_duration{step:result}': ['p(95)<2000'],
    answer_save_latency: ['p(95)<1000'],
    submit_latency: ['p(95)<3000'],
    business_errors: ['rate<0.001'],
  },
};

function think() {
  sleep(THINK_MIN + Math.random() * (THINK_MAX - THINK_MIN));
}

function login(email) {
  const csrf = http.get(`${BASE_URL}/api/auth/csrf`, { tags: { step: 'login' } });
  const csrfToken = csrf.status === 200 ? csrf.json('csrfToken') : null;
  if (!csrfToken) {
    businessErrors.add(true);
    return null;
  }

  http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    { email, password: PASSWORD, csrfToken, json: 'true' },
    { redirects: 0, tags: { step: 'login' } }
  );

  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL(BASE_URL);
  const ok = Boolean(cookies['__Secure-authjs.session-token'] || cookies['authjs.session-token']);
  check(null, { 'login ok': () => ok });
  businessErrors.add(!ok);
  return ok ? JSON_HEADERS : null;
}

export default function () {
  if (__ITER > 0) {
    sleep(60);
    return;
  }

  const headers = login(`loadtest-${__VU}@example.test`);
  if (!headers) return;

  const available = http.get(`${BASE_URL}/api/exams/available`, { headers, tags: { step: 'available_exams' } });
  businessErrors.add(!check(available, { 'available ok': (r) => r.status === 200 }));

  sleep(5 + Math.random() * 10);

  const start = http.post(`${BASE_URL}/api/exams/${EXAM_ID}/attempts`, null, { headers, tags: { step: 'start_attempt' } });
  const started = check(start, {
    'attempt started': (r) => r.status === 200 || r.status === 201,
    'no answer key leaked': (r) => !/isCorrect|correctOptionId|explanation/i.test(r.body),
  });
  businessErrors.add(!started);
  if (!started) return;

  const attemptId = start.json('attemptId');
  const attemptUrl = `${BASE_URL}/api/attempts/${attemptId}`;

  const read = http.get(attemptUrl, { headers, tags: { step: 'get_attempt' } });
  const readOk = check(read, {
    'attempt loaded': (r) => r.status === 200,
    '30 questions': (r) => (r.json('questions') || []).length === 30,
  });
  businessErrors.add(!readOk);
  if (!readOk) return;

  const questions = read.json('questions');
  let seq = questions.reduce((m, q) => Math.max(m, q.version || 0), 0);

  for (const q of questions) {
    think();
    const times = Math.random() < 0.2 ? 2 : 1;
    for (let i = 0; i < times; i++) {
      const opt = q.options[Math.floor(Math.random() * q.options.length)];
      seq += 1;
      const save = http.put(
        `${attemptUrl}/answers/${q.attemptQuestionId}`,
        JSON.stringify({ selectedOptionId: opt.optionId, clientSeq: seq }),
        { headers, tags: { step: 'save_answer' } }
      );
      saveLatency.add(save.timings.duration);
      const saved = check(save, {
        'answer saved': (r) => r.status === 200 && r.json('version') === seq,
      });
      businessErrors.add(!saved);
      if (saved && i === 0) questionsAnswered.add(1);
    }
  }

  const submit = http.post(
    `${attemptUrl}/submit`,
    JSON.stringify({ idempotencyKey: `submit-${attemptId}` }),
    { headers, tags: { step: 'submit' } }
  );
  submitLatency.add(submit.timings.duration);
  const submitted = check(submit, { 'submitted': (r) => r.status === 200 && r.json('status') === 'Submitted' });
  businessErrors.add(!submitted);
  if (submitted) attemptsSubmitted.add(1);

  const result = http.get(`${attemptUrl}/result`, { headers, tags: { step: 'result' } });
  businessErrors.add(!check(result, { 'result ok': (r) => r.status === 200 }));
}
```

Chạy:

```bash
k6 run -e BASE_URL=https://staging.example -e EXAM_ID=1 -e TEST_PASSWORD=*** exam_steady.js
```

Ghi chú:

- Với `THINK_MIN/MAX = 40/80` giây, một bài thi kéo dài ~30 phút → mỗi VU làm đúng 1 bài, đúng luật 1 lượt. VU xong sớm sẽ ngồi chờ (`__ITER > 0`).
- **Save storm**: copy script, đặt `THINK_MIN=1 THINK_MAX=3` và thay vòng lặp 30 câu bằng vòng lặp lưu lặp lại liên tục **trên cùng attempt** cho tới gần deadline (không submit). Như vậy vẫn tạo được tải dày mà không vi phạm luật 1 lượt.
- **Submit spike**: thêm biến `SUBMIT_AT` (ISO UTC); sau khi trả lời xong, `sleep((Date.parse(SUBMIT_AT) - Date.now()) / 1000)` rồi submit, để mọi VU nộp trong cùng cửa sổ. Kèm thử gửi submit 2 lần liên tiếp để kiểm tra idempotency.
- Callback credentials của NextAuth trả 302 kể cả khi sai mật khẩu, nên script xác định đăng nhập thành công bằng sự có mặt của cookie session, không dựa vào status. `redirects: 0` để không tính trang chuyển hướng vào thời gian login.
- `http_req_failed` coi mọi status ≥ 400 là lỗi; 302 của bước callback không bị tính.
- Nếu deploy trên Vercel: chạy test trên **Preview/Staging deployment** riêng nối DB staging, và báo trước cho Vercel/Neon theo chính sách của họ về kiểm thử tải.

## 5. Kiểm tra dữ liệu sau mỗi lần chạy

So sánh `questions_answered` và `attempts_submitted` của k6 với DB, rồi chạy `loadtest/check-data.sql` (T-SQL, tên bảng thật của `schema.prisma`) — **mọi truy vấn phải trả về 0 dòng**:

```bash
sqlcmd -S localhost -E -C -d KymdanDealerPortal -W -i loadtest/check-data.sql
```

| Truy vấn | Phát hiện |
|---|---|
| 1 | Một đại lý có hơn 1 lượt chính thức chưa hủy (vi phạm EX-03) |
| 2 | Đáp án trùng cho cùng một câu (vi phạm EX-07) |
| 3 | Lượt `InProgress` quá hạn > 2 phút (cron / lazy check không chạy) |
| 4 | `correct_count` đã lưu lệch với điểm tính lại từ snapshot (EX-08) |

Đã chạy thử trên DB dev sau bộ test e2e (2026-10-12): cả 4 truy vấn trả 0 dòng. Khi chuyển Postgres: `JSON_VALUE(x, '$.k')` → `x::jsonb->>'k'`, `SYSUTCDATETIME()` → `now()`, `CROSS APPLY` → `LEFT JOIN LATERAL`.

## 6. Chỉ số cần theo dõi khi chạy

| Lớp | Chỉ số |
|---|---|
| API | Request rate, p50/p95/p99 theo `step`, 4xx/5xx, timeout |
| Ứng dụng | CPU, RAM, event loop lag của Node, số request đang xử lý; trên Vercel: thời lượng function, cold start, số lần gọi đồng thời |
| Database | CPU, IO, lock waits, deadlocks, query duration, số connection (Prisma connection pool; Neon: pooled connection) |
| Redis (nếu dùng) | Hit rate, latency, memory, eviction |
| Nghiệp vụ | Attempt tạo thành công, câu trả lời lưu, submit thành công, attempt trùng, điểm lệch |

## 7. Báo cáo bàn giao

Mỗi lần chạy nghiệm thu nộp: phiên bản build, cấu hình hạ tầng, dữ liệu test, tham số kịch bản (VU, think time, thời lượng), tóm tắt k6 (`--summary-export`), ảnh dashboard tài nguyên, kết quả 4 truy vấn kiểm tra dữ liệu, các bottleneck đã sửa giữa vòng 1 và vòng cuối.
