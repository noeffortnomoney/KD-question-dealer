# Kiểm thử tải

Kế hoạch, tiêu chí và truy vấn kiểm tra dữ liệu: [Docs/07-kiem-thu-tai.md](../Docs/07-kiem-thu-tai.md).

## Chuẩn bị (chỉ trên DB dev/staging)

```bash
npm run loadtest:seed -- 1000 <examId>
```

Tạo `loadtest-1@example.test` … `loadtest-1000@example.test` (mật khẩu `LoadTest@123`, đổi bằng biến `LOADTEST_PASSWORD`), giao kỳ thi `<examId>` và xóa các lượt thi cũ của tài khoản loadtest để chạy lại được. Kỳ thi phải đang mở và đủ câu hỏi.

## Chạy

Cần cài [k6](https://k6.io).

```bash
k6 run -e BASE_URL=http://localhost:3000 -e EXAM_ID=<examId> loadtest/k6/exam_steady.js
```

Chạy thử nhỏ, nhịp nhanh:

```bash
k6 run -e EXAM_ID=<examId> -e MAX_VUS=20 -e STEADY=2m -e THINK_MIN=1 -e THINK_MAX=2 loadtest/k6/exam_steady.js
```

Load test phải chạy trên bản build production (`npm run build && npm start`), không chạy trên `npm run dev`.
