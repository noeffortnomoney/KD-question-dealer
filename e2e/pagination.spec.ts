import { expect, test } from "@playwright/test";
import { cleanupTestDealers, createTestDealers } from "./db";
import { ADMIN, dealer, login } from "./helpers";

const PREFIX = "E2EPG";

test.beforeAll(async () => {
  await cleanupTestDealers(PREFIX);
  await createTestDealers(PREFIX, 25);
});

test.afterAll(async () => {
  await cleanupTestDealers(PREFIX);
});

test("bảng có phân trang: mặc định 10 dòng, đổi 20/50, chuyển trang, giữ bộ lọc", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto(`/admin/dealers?q=${PREFIX}`);
  const rows = page.locator("tbody tr");
  const range = page.getByTestId("pagination-range");
  const sizeSelect = page.getByLabel("Số dòng mỗi trang");

  await expect(range).toHaveText("Hiển thị 1–10 / 25");
  await expect(rows).toHaveCount(10);
  await expect(page.locator("thead th").first()).toHaveText("STT");
  await expect(rows.first().getByTestId("stt")).toHaveText("1");
  await expect(rows.last().getByTestId("stt")).toHaveText("10");
  await expect(sizeSelect).toHaveValue("10");
  await expect(sizeSelect.locator("option")).toHaveText(["10", "20", "50", "100"]);

  await page.getByRole("button", { name: "3", exact: true }).click();
  await expect(page).toHaveURL(/page=3/);
  await expect(range).toHaveText("Hiển thị 21–25 / 25");
  await expect(rows).toHaveCount(5);
  await expect(rows.first().getByTestId("stt")).toHaveText("21");
  await expect(rows.last().getByTestId("stt")).toHaveText("25");
  await expect(page).toHaveURL(new RegExp(`q=${PREFIX}`));
  await expect(page.getByRole("button", { name: "Trang sau" })).toBeDisabled();

  await page.getByRole("button", { name: "Trang đầu" }).click();
  await expect(range).toHaveText("Hiển thị 1–10 / 25");
  await expect(page.getByRole("button", { name: "Trang trước" })).toBeDisabled();

  const jump = page.getByLabel("Chuyển đến trang");
  await expect(jump).toHaveValue("1");
  await jump.fill("2");
  await jump.press("Enter");
  await expect(page).toHaveURL(/page=2/);
  await expect(range).toHaveText("Hiển thị 11–20 / 25");
  await expect(page.getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(jump).toHaveValue("2");
  await jump.fill("99");
  await jump.press("Enter");
  await expect(range).toHaveText("Hiển thị 21–25 / 25");
  await expect(jump).toHaveValue("3");
  await page.getByRole("button", { name: "Trang đầu" }).click();
  await expect(range).toHaveText("Hiển thị 1–10 / 25");

  await sizeSelect.selectOption("20");
  await expect(page).toHaveURL(/size=20/);
  await expect(rows).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(range).toHaveText("Hiển thị 21–25 / 25");

  await sizeSelect.selectOption("50");
  await expect(page).not.toHaveURL(/page=/);
  await expect(range).toHaveText("Hiển thị 1–25 / 25");
  await expect(rows).toHaveCount(25);
  const nav = page.getByRole("navigation", { name: "Phân trang" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("button", { name: "1", exact: true })).toHaveAttribute("aria-current", "page");
  for (const name of ["Trang đầu", "Trang trước", "Trang sau", "Trang cuối"]) {
    await expect(nav.getByRole("button", { name })).toBeDisabled();
  }
  await expect(page.getByLabel("Chuyển đến trang")).toBeDisabled();

  await page.goto(`/admin/dealers?q=${PREFIX}&page=99`);
  await expect(range).toHaveText("Hiển thị 21–25 / 25");
});

test("bảng xem trước khi import cũng phân trang 10 dòng", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/questions/import");
  const header = "Chủ đề,Nội dung câu hỏi,Đáp án A,Đáp án B,Đáp án đúng";
  const lines = Array.from({ length: 15 }, (_, i) => `E2E chủ đề phân trang,E2E câu phân trang số ${i + 1},Một,Hai,A`);
  await page.locator("input[type=file]").setInputFiles({ name: "q.csv", mimeType: "text/csv", buffer: Buffer.from([header, ...lines].join("\n"), "utf8") });
  await page.getByRole("button", { name: /Tải lên & kiểm tra/ }).click();
  const range = page.getByTestId("pagination-range");
  await expect(range).toHaveText("Hiển thị 1–10 / 15");
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(range).toHaveText("Hiển thị 11–15 / 15");
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(page.locator("tbody tr").first().getByTestId("stt")).toHaveText("11");
});

test("bảng phía đại lý (Kết quả của tôi) có bộ chọn số dòng", async ({ page }) => {
  await login(page, dealer(1));
  await page.goto("/my-results");
  const tableCount = await page.locator("tbody tr").count();
  if (tableCount > 0) {
    await expect(page.getByLabel("Số dòng mỗi trang")).toHaveValue("10");
    await expect(page.getByTestId("pagination-range")).toContainText(`1–${Math.min(10, tableCount)}`);
  }
});
