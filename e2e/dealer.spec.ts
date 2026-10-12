import { expect, test } from "@playwright/test";
import { dealer, login } from "./helpers";

test("chưa đăng nhập bị chuyển về trang đăng nhập", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
});

test("sai mật khẩu hiện thông báo chung", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Nhập email của bạn").fill("dealer01@kymdan.local");
  await page.getByPlaceholder("Nhập mật khẩu").fill("sai-mat-khau-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByText(/Email hoặc mật khẩu không đúng/)).toBeVisible();
});

test("đại lý xem trang chủ, không vào được trang quản trị", async ({ page }) => {
  await login(page, dealer(1));
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Kiến thức vững vàng")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lịch training sắp tới" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kỳ thi của bạn" })).toBeVisible();
  await page.goto("/admin/dealers");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("khóa học: xem tài liệu và lịch training", async ({ page }) => {
  await login(page, dealer(1));
  await page.getByRole("link", { name: "Khóa đào tạo" }).first().click();
  await expect(page.getByRole("heading", { name: "Khóa đào tạo", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /Tiếp tục|Học ngay|Xem lại/ }).first().click();
  await expect(page.getByRole("heading", { name: "Tài liệu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lịch training" })).toBeVisible();
  await page.goto("/training-sessions?tab=all");
  await expect(page.getByText("Google Meet").first()).toBeVisible();
});

test("luyện tập: trả lời một câu và thấy giải thích", async ({ page }) => {
  await login(page, dealer(2));
  await page.goto("/practice");
  await page.getByRole("button", { name: /Bắt đầu luyện tập/ }).click();
  await expect(page).toHaveURL(/\/practice\/[0-9a-f-]{36}/);
  await page.getByRole("radio").first().click();
  await expect(page.getByText(/Chính xác!|Chưa đúng/)).toBeVisible();
});

test("kết quả kỳ thi đã đóng hiện điểm và chi tiết đáp án", async ({ page }) => {
  await login(page, dealer(1));
  await page.goto("/my-results");
  await expect(page.getByText("Kỳ thi kỹ năng tư vấn (đã kết thúc)")).toBeVisible();
  await page.getByRole("link", { name: "Chi tiết" }).first().click();
  await expect(page.getByText("Bạn đã hoàn thành bài thi!")).toBeVisible();
  await expect(page.getByText("Đạt", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chi tiết bài làm" })).toBeVisible();
});

test("làm bài thi chính thức: autosave, tải lại trang, nộp bài", async ({ page }) => {
  await login(page, dealer(4));
  await page.goto("/exams");
  const card = page.locator("[data-exam-card=\"Kỳ thi kiến thức sản phẩm (demo)\"]");
  await card.getByRole("link", { name: "Vào thi" }).click();
  await expect(page.getByText("Hướng dẫn trước khi thi", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();

  await expect(page).toHaveURL(/\/attempts\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Câu 1/30")).toBeVisible();
  await expect(page.getByText("Thời gian còn lại")).toBeVisible();

  const first = page.getByRole("radio").nth(1);
  await first.click();
  await expect(page.getByText(/Đã lưu lúc/).first()).toBeVisible();
  await expect(first).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: /Câu tiếp theo/ }).click();
  await expect(page.getByText("Câu 2/30")).toBeVisible();
  await page.keyboard.press("1");
  await expect(page.getByRole("radio").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/Đã lưu lúc/).first()).toBeVisible();

  await page.reload();
  await expect(page.getByText("Câu 1/30")).toBeVisible();
  await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("p", { hasText: "Đã trả lời" })).toContainText("2/30");

  await page.getByRole("button", { name: "Nộp bài" }).first().click();
  await expect(page.getByText("Xác nhận nộp bài")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("2/30");
  await page.getByRole("dialog").getByRole("button", { name: "Nộp bài" }).click();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByText("Bạn đã hoàn thành bài thi!")).toBeVisible();
  await expect(page.getByText("Điểm số")).toBeVisible();

  await page.goto("/exams");
  await expect(page.locator("[data-exam-card=\"Kỳ thi kiến thức sản phẩm (demo)\"]").getByRole("link", { name: "Xem kết quả" })).toBeVisible();
});
