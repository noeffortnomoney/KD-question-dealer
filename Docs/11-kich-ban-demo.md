# 11 — Kịch bản demo cho sếp (không chuyên IT)

Thời lượng: **khoảng 25 phút** (20 phút demo, 5 phút hỏi đáp và xin ý kiến).
Nguyên tắc: nói bằng **lợi ích kinh doanh**, không nói công nghệ. Mỗi màn hình chỉ nhấn **1–2 ý**, đừng bấm hết mọi nút.

---

## 0. Chuẩn bị trước buổi demo (làm trước 30–60 phút)

### Máy và trình duyệt

- [ ] Chạy bản nhanh: `npm run preview` → mở `http://localhost:3001` (bản dev ở cổng 3000 lần đầu mở trang chậm 1–5 giây, dễ gây cảm giác "web chậm").
- [ ] Mở **2 cửa sổ trình duyệt** cạnh nhau (hoặc 2 màn hình):
  - Cửa sổ **thường** → đăng nhập **quản trị viên** `admin@kymdan.local`.
  - Cửa sổ **ẩn danh** (Ctrl+Shift+N) → đăng nhập **đại lý** `dealer01@kymdan.local` / `Dealer@123`.
- [ ] Phóng to chữ 110–125% (Ctrl + `+`) để sếp nhìn rõ khi chiếu.
- [ ] Tắt thông báo Zalo/Teams/email trên máy chiếu.
- [ ] **Không** chạy `npm run db:seed` hoặc `npm run test:e2e` trước demo (2 lệnh này xóa sạch dữ liệu). Nên sao lưu DB trước.

### Dữ liệu cần có sẵn

| Cần | Cách chuẩn bị | Dùng ở bước |
|---|---|---|
| Một **kỳ thi đang mở** mà dealer01 chưa làm | Admin → Kỳ thi → Tạo kỳ thi "Kỳ thi demo kiến thức sản phẩm": 30 câu, 45 phút, mở từ hôm nay đến tuần sau → tab Bộ câu hỏi thêm ≥ 30 câu → tab Phân công giao **tất cả đại lý** → **Mở kỳ thi** | B6 |
| Một **buổi training sắp bắt đầu** có tài liệu | Admin → **Lịch training** → **Thêm buổi training**: bắt đầu **sau giờ demo khoảng 10 phút**, dán link Google Meet thật của mình, giao cho **tất cả đại lý** → Lưu → ở tab **Tài liệu** thêm 1 link (bảng giá / slide) | B4, B5, A3 |
| Một **kỳ thi đã kết thúc có điểm** | Đã có sẵn: "Kỳ thi kỹ năng tư vấn (đã kết thúc)" — dealer01 được 93,33 điểm | B8, A5 |
| File Excel import 3 đại lý | Admin → Quản lý đại lý → Import → **Tải file mẫu** → điền 3 dòng (mã `DEMO01`…`DEMO03`, email thật hoặc `demo01@kymdan.local`…) → lưu ra Desktop | A6 |

- [ ] Đăng nhập thử dealer01 và admin một lần để chắc mật khẩu đúng.
- [ ] Mở sẵn Google Meet của buổi training trên điện thoại (phòng khi cần cho sếp xem cảnh trong phòng họp).

---

## 1. Mở đầu — vấn đề và mục tiêu (2 phút)

**Nói:**

> "Hiện nay mình đào tạo đại lý rời rạc: tài liệu gửi qua Zalo, lịch học nhắn từng người, kiểm tra kiến thức thì làm giấy hoặc Google Form, chấm và tổng hợp bằng tay, không biết ai đã học, ai chưa.
>
> Web này gom tất cả vào **một chỗ**: đại lý xem lịch họp online với công ty kèm tài liệu, tự luyện tập, rồi **thi chính thức** — hệ thống tự chấm, tự xếp hạng. Bên mình chỉ cần mở trang báo cáo là biết toàn bộ tình hình, xuất Excel được ngay.
>
> Em demo 2 góc nhìn: **đại lý** dùng thế nào, và **công ty quản lý** thế nào."

---

## 2. Góc nhìn ĐẠI LÝ (cửa sổ ẩn danh) — 10 phút

| Bước | Làm | Nói (ý chính) |
|---|---|---|
| **B1** Đăng nhập | Ở trang đăng nhập, gõ email + mật khẩu | "Mỗi đại lý có một tài khoản. Lần đầu đăng nhập bằng mật khẩu `123456`, hệ thống **bắt buộc đổi mật khẩu** ngay." |
| **B2** Trang chủ | Dừng ở **Trang chủ**, chỉ lần lượt: *Lịch training sắp tới*, *Kỳ thi của bạn*, *Kết quả gần nhất* | "Vào là thấy ngay việc cần làm, không phải đi tìm." |
| **B3** Chuông thông báo | Bấm **cái chuông** góc phải trên | "Khi công ty xếp lịch họp mới, đổi lịch, mở kỳ thi… đại lý nhận thông báo ở đây. Sắp đến giờ học mà chưa vào, hoặc kỳ thi sắp đóng mà chưa làm, hệ thống **tự nhắc**." |
| **B4** Lịch training | Menu **Lịch training** → chỉ buổi sắp diễn ra → bấm **Tham gia** (Meet mở ở tab mới, đóng lại) | "Học online qua **Google Meet miễn phí**. Nút Tham gia chỉ hiện trước giờ học 15 phút. Ai bấm vào là công ty **biết ngay** — lát em cho sếp xem bên quản lý." |
| **B5** Tài liệu buổi họp | Vẫn ở **Lịch training**, chỉ nội dung buổi và các nút tài liệu bên dưới → bấm mở 1 tài liệu | "Tài liệu (slide, bảng giá, chính sách) gắn ngay vào buổi họp, đại lý xem trước hoặc sau buổi lúc nào cũng được — không cần gửi Zalo." |
| *(tùy chọn)* Luyện tập | Menu **Luyện tập** → **Bắt đầu luyện tập** → trả lời 2 câu | "Trước khi thi thật, đại lý luyện **không giới hạn số lần**, trả lời xong biết đúng sai và giải thích. Câu hỏi đang dùng trong kỳ thi thật **không xuất hiện** ở luyện tập → không lộ đề." |
| **B6** Vào thi | Menu **Kỳ thi** → "Kỳ thi demo kiến thức sản phẩm" → **Vào thi** → **Bắt đầu làm bài** → hộp "Bắt đầu bài thi chính thức?" → **Bắt đầu** | "Mỗi đại lý **chỉ được thi 1 lần**. Hệ thống hỏi lại trước khi bắt đầu để tránh bấm nhầm." |
| **B7** Trong phòng thi | Trả lời 3–4 câu. Chỉ **đồng hồ đếm ngược**, dòng **"Đáp án được lưu tự động"**, bấm **Đánh dấu** một câu, chỉ **lưới số câu** | "30 câu, 45 phút. Đồng hồ chạy theo **giờ của máy chủ**, đại lý không chỉnh giờ điện thoại để gian lận được. Mỗi câu chọn xong là **lưu ngay**." |
| **B7b** Điểm "ăn tiền" | **Đóng hẳn tab** phòng thi → vào lại **Kỳ thi** → **Tiếp tục làm bài** | "Giả sử đại lý **mất mạng, hết pin, lỡ tắt trình duyệt**… vào lại vẫn **còn nguyên** câu đã làm, đồng hồ vẫn chạy tiếp, không mất bài, không phải thi lại." |
| **B7c** Nộp bài | Bấm **Nộp bài** → hộp "Xác nhận nộp bài" báo "Còn … câu chưa trả lời" → **Nộp bài** | "Nộp mà còn câu bỏ trống thì hệ thống nhắc. Hết 45 phút mà chưa nộp thì hệ thống **tự thu bài**." |
| **B8** Kết quả | Xem trang kết quả vừa hiện → menu **Kỳ thi** → ở thẻ "Kỳ thi kỹ năng tư vấn (đã kết thúc)" bấm **Xếp hạng** | "Chấm **tự động, tức thì**, không ai sửa điểm được. Sau khi kỳ thi kết thúc, đại lý xem được **thứ hạng của mình**." |

> Mẹo: bước B6–B7c là phần sếp ấn tượng nhất — làm chậm, để sếp nhìn đồng hồ và lúc đóng/mở lại tab.

---

## 3. Góc nhìn CÔNG TY / QUẢN TRỊ (cửa sổ thường) — 8 phút

| Bước | Làm | Nói (ý chính) |
|---|---|---|
| **A1** Tổng quan | Menu **Tổng quan** | "Một màn hình thấy hết: bao nhiêu đại lý, đã thi bao nhiêu, điểm trung bình từng kỳ thi, việc cần xử lý." |
| **A2** Bài vừa nộp | Menu **Kết quả & báo cáo** → ô chọn kỳ thi chọn "Kỳ thi demo kiến thức sản phẩm" → **Xem**. Chỉ 4 ô số: *Được giao*, *Đã thi*, *Tỷ lệ đạt*, *Điểm trung bình* → lọc *Tất cả khu vực* / *Mọi kết quả* → bấm nút **Excel** | "Bài dealer01 vừa nộp **đã có ở đây** — không cần ai tổng hợp. Biết ngay bao nhiêu người **chưa thi**, tỷ lệ đạt, lọc theo khu vực, tải Excel một nút." |
| **A3** Điểm danh training | Menu **Lịch training** → mở buổi vừa bấm Tham gia | "Mỗi buổi họp giao cho tất cả, theo khu vực hoặc từng đại lý. Đây là danh sách điểm danh: **ai đã bấm vào, lúc mấy giờ, ai chưa vào**. Tự cập nhật trong lúc đang họp, xuất Excel được. Tab Tài liệu để đính kèm slide." |
| **A4** Ngân hàng câu hỏi | Menu **Ngân hàng câu hỏi** → chỉ nút **Import** | "Câu hỏi soạn trong **Excel** rồi tải lên cả trăm câu một lần — tải file mẫu, điền, tải lên, hệ thống báo dòng nào sai." |
| **A5** Xếp hạng | Menu **Kỳ thi** → "Kỳ thi kỹ năng tư vấn (đã kết thúc)" → tab **Xếp hạng** | "Bảng xếp hạng toàn bộ đại lý: điểm cao xếp trên, bằng điểm thì ai làm **nhanh hơn** xếp trên. Lọc theo khu vực, xuất Excel để khen thưởng." |
| **A6** Thêm đại lý hàng loạt | Menu **Quản lý đại lý** → **Import** → chọn file Excel 3 đại lý → **Tải lên & kiểm tra** → **Xác nhận import** | "Có 850 đại lý cũng chỉ cần **1 file Excel**. Hệ thống kiểm tra trước: trùng mã, sai email báo từng dòng. Tài khoản tạo xong đăng nhập bằng `123456` và phải đổi mật khẩu." |
| **A7** Cấp lại lượt thi *(chỉ mở ra xem, không bấm cấp)* | Trong **Kết quả & báo cáo**, ở dòng bài thi của dealer01 bấm biểu tượng **con mắt "Xem bài làm"** (cột Thao tác) → bảng chi tiết bài làm hiện ra | "Nếu đại lý gặp sự cố thật (mất điện cả buổi…), quản trị có thể **cấp lại lượt thi**, bắt buộc ghi lý do." |
| **A8** Nhật ký thao tác | Menu **Audit log** | "Mọi thao tác quan trọng — ai thêm đại lý, ai sửa đề, ai cấp lại lượt thi — đều được **ghi lại, không xóa được**. Màn hình này **chỉ tài khoản quản trị chính** xem được, các quản trị viên khác không thấy." |

---

## 4. Chốt lại (2 phút)

**Nói:**

> "Tóm lại web giúp mình 4 việc:
> 1. **Họp đại lý tập trung** — lịch họp online, tài liệu kèm theo, điểm danh ở một nơi.
> 2. **Thi công bằng, minh bạch** — mỗi người 1 lượt, tính giờ chuẩn, chấm tự động, mất mạng không mất bài.
> 3. **Đỡ việc tay** — thêm đại lý, câu hỏi bằng Excel; kết quả, xếp hạng, điểm danh xuất Excel ngay.
> 4. **Kiểm soát** — biết ai học, ai thi, ai chưa; mọi thao tác đều có nhật ký.
>
> Hệ thống được thiết kế cho **khoảng 1.000 đại lý thi cùng lúc**."

### Xin sếp quyết (chọn 3–4 câu, đừng hỏi hết)

| Câu hỏi | Đang để mặc định |
|---|---|
| Điểm đạt bao nhiêu? | 70% |
| Đại lý có được xem **top 10** xếp hạng không, hay chỉ thấy hạng của mình? | Chỉ thấy hạng của mình (bật top 10 theo từng kỳ thi được) |
| Thi xong cho xem **điểm ngay**, còn **đáp án đúng** khi nào? | Điểm ngay; đáp án sau khi kỳ thi đóng |
| Google Meet miễn phí giới hạn khoảng 60 phút/buổi nhóm và khoảng 100 người/phòng → chia buổi theo khu vực, hay mua Google Workspace? | Chia buổi theo khu vực |
| Khi nào đưa lên mạng chạy thật (cần chi phí máy chủ hằng tháng), chạy thử với nhóm đại lý nào trước? | Chưa chốt — đề xuất chạy thử 1 khu vực |

---

## 5. Câu sếp có thể hỏi — trả lời gợi ý

| Sếp hỏi | Trả lời |
|---|---|
| "Đại lý dùng điện thoại được không?" | Được, giao diện tự co theo màn hình điện thoại. *(Nếu có thời gian: mở web trên điện thoại cho sếp xem.)* |
| "Đại lý có xem được đáp án để chép cho nhau không?" | Đáp án đúng **không bao giờ gửi xuống máy đại lý** trong lúc thi, chỉ máy chủ biết. Đề có thể **trộn câu và trộn thứ tự đáp án**, mỗi người một kiểu. |
| "Nhờ người khác thi hộ thì sao?" | Mỗi tài khoản 1 lượt, đăng nhập bằng mật khẩu riêng. Thi hộ ngồi cạnh thì phần mềm nào cũng khó chặn — nếu cần chặt hơn, có thể tổ chức thi tập trung theo khu vực. |
| "Mạng yếu, đang thi bị rớt mạng?" | Bài **không mất** — câu nào đã chọn đã lưu; vào lại làm tiếp. Màn hình báo "đang thử lưu lại" khi mạng chập chờn. |
| "Có biết ai thực sự ngồi học hết buổi Meet không?" | Bản Meet miễn phí chỉ biết **ai đã bấm vào học**, không biết ở lại bao lâu. Muốn chính xác hơn: người giảng đọc một **mã điểm danh** giữa buổi để đại lý nhập, hoặc nâng cấp Google Workspace. |
| "Quên mật khẩu thì sao?" | Đại lý báo công ty, quản trị bấm **cấp lại mật khẩu** (mặc định `123456`), đại lý đăng nhập rồi tự đổi. |
| "Dữ liệu có an toàn không?" | Mật khẩu được mã hóa, không ai đọc được, kể cả quản trị. Đăng nhập sai 5 lần thì khóa 15 phút. Mọi thao tác quản trị đều có nhật ký. |
| "Tốn bao nhiêu tiền?" | Hiện chạy trên máy nội bộ, chưa tốn phí. Khi đưa lên mạng sẽ có chi phí máy chủ + cơ sở dữ liệu hằng tháng — em sẽ báo giá cụ thể sau. |
| "Bao giờ dùng được?" | Các chức năng chính đã chạy được như sếp vừa xem. Còn: đưa lên mạng, chạy thử tải 1.000 người, chạy thử với một nhóm đại lý. |

---

## 6. Sự cố khi demo — xử lý nhanh

| Sự cố | Xử lý |
|---|---|
| Trang mở chậm vài giây | Đang chạy bản dev → chuyển sang `npm run preview` (cổng 3001). Trong lúc chờ nói tiếp ý chính. |
| Không thấy kỳ thi ở phía đại lý | Kỳ thi chưa **Mở** hoặc chưa **giao** cho đại lý đó → admin mở tab Phân công. Trang kỳ thi bên admin có **dải màu vàng** báo đại lý chưa thấy khi còn là bản nháp, bấm nút trên dải để xuất bản ngay. |
| Không thấy nút **Tham gia** | Chưa tới 15 phút trước giờ học → sửa giờ buổi training sớm lên. |
| Đại lý không thấy buổi training | Buổi chưa giao cho đại lý đó → admin mở buổi → **Giao cho đại lý**. Danh sách Lịch training bên admin ghi chữ vàng "Chưa giao cho đại lý nào" nếu quên giao. |
| dealer01 đã thi kỳ demo rồi | Admin cấp lại lượt thi (ghi lý do "demo"), hoặc dùng `dealer02@kymdan.local`. |
| Quên mật khẩu admin | Không đoán nhiều lần (sai 5 lần khóa 15 phút) → dùng `npm run user:create` tạo lại. |

---

## 7. Sau demo

- [ ] Ghi lại các quyết định của sếp vào [09](09-cau-hoi-mo-rui-ro.md) mục "Nhật ký quyết định" (ngày + nội dung).
- [ ] Xóa 3 đại lý `DEMO01…03` và kỳ thi demo nếu không dùng nữa (hoặc lưu trữ).
