import { expect, test, type Page } from "@playwright/test";
import { ADMIN, login } from "./helpers";

async function logout(page: Page) {
  await page.getByRole("banner").getByRole("button").last().click();
  await page.getByRole("menuitem", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login/);
}

test("quản trị viên xem tổng quan, không vào được trang đại lý", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Tổng quan hệ thống" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tình trạng tham gia kỳ thi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Điểm trung bình theo kỳ thi" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/admin$/);
});

test("thêm đại lý, đại lý đăng nhập lần đầu bị buộc đổi mật khẩu", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/dealers");
  await page.getByRole("button", { name: "Thêm đại lý" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByPlaceholder("VD: HCM001").fill("E2E001");
  await dialog.getByPlaceholder("Nhập tên đại lý").fill("Đại lý E2E");
  await dialog.getByPlaceholder("VD: TP. Hồ Chí Minh").fill("Hà Nội");
  await dialog.getByPlaceholder("Nhập họ và tên").fill("Người Kiểm Thử");
  await dialog.getByPlaceholder("Nhập email").fill("e2e001@kymdan.local");
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await dialog.getByRole("button", { name: "Xác nhận" }).click();
  const temp = (await dialog.getByTestId("temp-password").textContent())!.trim();
  expect(temp).toBe("123456");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("cell", { name: "E2E001", exact: true })).toBeVisible();

  await logout(page);
  await login(page, { email: "e2e001@kymdan.local", password: temp });
  await expect(page).toHaveURL(/\/change-password/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/change-password/);
  await page.locator("input[type=password]").nth(0).fill(temp);
  await page.locator("input[type=password]").nth(1).fill("MatKhauMoi123");
  await page.locator("input[type=password]").nth(2).fill("MatKhauMoi123");
  await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Kiến thức vững vàng")).toBeVisible();
});

test("import đại lý từ CSV: xem trước, báo lỗi theo dòng, xác nhận", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/dealers/import");
  const csv = [
    "Mã đại lý,Tên đại lý,Họ tên người dùng,Email đăng nhập,Số điện thoại,Khu vực",
    "IMP001,Đại lý Import 1,Nguyễn Import,imp001@kymdan.local,0909000001,Cần Thơ",
    "IMP002,Đại lý Import 2,Trần Import,imp002@kymdan.local,,Cần Thơ",
    "HCM001,Trùng mã,Lê Trùng,trung@kymdan.local,,",
    ",Thiếu mã,Phạm Thiếu,khong-hop-le,,",
  ].join("\n");
  await page.locator("input[type=file]").setInputFiles({ name: "dai-ly.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
  await page.getByRole("button", { name: /Tải lên & kiểm tra/ }).click();
  await expect(page.getByText("Tổng số dòng")).toBeVisible();
  await expect(page.getByText("Mã đại lý đã tồn tại trong hệ thống")).toBeVisible();
  await expect(page.getByText("Email không hợp lệ")).toBeVisible();
  await expect(page.getByRole("link", { name: /Tải file dòng lỗi/ })).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận import" }).click();
  await expect(page.getByRole("main").getByText("Đã tạo 2 đại lý")).toBeVisible();
  await expect(page.getByTestId("import-default-password")).toContainText("123456");
  await page.goto("/admin/dealers?q=IMP");
  await expect(page.getByRole("cell", { name: "IMP001", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "IMP002", exact: true })).toBeVisible();
});

test("tạo câu hỏi và xuất bản", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/questions/new");
  await page.locator("textarea").first().fill("Câu hỏi kiểm thử tự động: chọn đáp án B");
  const opts = page.getByPlaceholder(/Lựa chọn [A-D]/);
  await opts.nth(0).fill("Đáp án A");
  await opts.nth(1).fill("Đáp án B");
  await opts.nth(2).fill("Đáp án C");
  await opts.nth(3).fill("Đáp án D");
  await page.getByLabel("Đáp án đúng B").check();
  await page.getByRole("button", { name: "Lưu câu hỏi" }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/[0-9a-f-]{36}/);
  await page.getByRole("button", { name: "Xuất bản" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản" }).click();
  await expect(page.getByText("Đã xuất bản").first()).toBeVisible();
});

test("tạo kỳ thi, chặn xuất bản khi thiếu câu hỏi, xuất bản khi đủ", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/exams/new");
  await page.locator("form input").first().fill("Kỳ thi kiểm thử E2E");
  await page.getByRole("button", { name: "Tạo kỳ thi" }).click();
  await expect(page).toHaveURL(/tab=questions/);

  await page.locator("select").first().selectOption({ label: "Bảo quản & bảo hành" });
  await page.getByRole("button", { name: /Thêm tất cả trong chủ đề/ }).click();
  await expect(page.getByText("Đã thêm 10 câu hỏi")).toBeVisible();

  await page.getByRole("link", { name: "Phân công đại lý" }).click();
  await page.getByRole("button", { name: "Giao cho đại lý" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Giao", exact: true }).click();
  await expect(page.getByText(/Đã giao thêm \d+ đại lý/)).toBeVisible();

  await page.getByRole("button", { name: "Xuất bản" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản" }).click();
  await expect(page.getByText("Chưa đủ câu hỏi đã xuất bản: có 10/30 câu (EX-01)")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Cấu hình" }).click();
  await page.locator("input[type=number]").first().fill("10");
  await page.getByRole("button", { name: "Lưu cấu hình" }).click();
  await expect(page.getByText("Đã lưu kỳ thi").first()).toBeVisible();
  await page.getByRole("button", { name: "Xuất bản" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản" }).click();
  await expect(page.getByText("Đã mở kỳ thi")).toBeVisible();
  await expect(page.getByText("Đang mở").first()).toBeVisible();
});

test("báo cáo: xem chi tiết lượt thi, cấp lại lượt có lý do, ghi audit log, export Excel", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/reports");
  await page.getByLabel("Chọn kỳ thi").selectOption({ label: "Kỳ thi kỹ năng tư vấn (đã kết thúc) (đã đóng)" });
  await page.getByRole("button", { name: "Xem" }).click();
  await expect(page.getByText("Tỷ lệ đạt").first()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Excel" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/);

  await page.getByTestId("report-row-HN001").click();
  await expect(page.getByText("Chi tiết lượt thi")).toBeVisible();
  await expect(page.getByText(/Bài làm \(30\/30 câu đã trả lời\)/)).toBeVisible();
  await page.getByRole("button", { name: "Cấp lại lượt thi" }).click();
  await page.getByRole("dialog", { name: "Cấp lại lượt thi" }).locator("textarea").fill("Đại lý mất điện giữa giờ thi, đã xác minh");
  await page.getByRole("button", { name: "Xác nhận cấp lại" }).click();
  await expect(page.getByText("Đã hủy lượt thi cũ và cấp lại lượt mới")).toBeVisible();
  await expect(page.getByText(/Đã hủy lúc/)).toBeVisible();

  await page.goto("/admin/audit-logs");
  await expect(page.getByText("Cấp lại lượt thi").first()).toBeVisible();
});

test("lịch training: thêm tài liệu dạng link vào buổi training", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page.getByRole("link", { name: "Khóa đào tạo" })).toHaveCount(0);
  await page.goto("/admin/training-sessions?scope=all");
  await page.getByRole("link", { name: "Kỹ năng tư vấn bán hàng" }).click();
  await page.getByRole("link", { name: /^Tài liệu \(\d+\)$/ }).click();
  await page.locator("form input").first().fill("Tài liệu kiểm thử E2E");
  await page.getByPlaceholder("https://").fill("https://example.com/e2e");
  await page.getByRole("button", { name: "Thêm tài liệu" }).click();
  await expect(page.getByText("Tài liệu kiểm thử E2E")).toBeVisible();
});
