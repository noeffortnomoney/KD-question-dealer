import { expect, test } from "@playwright/test";
import { cleanupTestExams } from "./db";
import { ADMIN, login } from "./helpers";

test.afterAll(async () => {
  await cleanupTestExams();
});

test("thêm câu hỏi vào bộ đề: tìm kiếm, chọn tất cả câu đang hiển thị, thêm", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await login(page, ADMIN);
  await page.goto("/admin/exams/new");
  await page.locator("form input").first().fill(`E2E chọn câu hỏi ${Date.now()}`);
  await page.getByRole("button", { name: "Tạo kỳ thi" }).click();
  await expect(page).toHaveURL(/tab=questions/);

  const items = page.locator("label").filter({ has: page.locator("input[type=checkbox]:not([aria-label])") });
  const before = await items.count();
  expect(before).toBeGreaterThan(5);

  await page.getByLabel("Tìm câu hỏi").fill("bảo hành");
  await expect(page).toHaveURL(/[?&]q=/);
  await expect.poll(() => items.count()).toBeLessThan(before);
  const found = await items.count();
  expect(found).toBeGreaterThan(0);
  for (const text of await items.allInnerTexts()) expect(text.toLowerCase()).toContain("bảo hành");

  await page.getByLabel("Chọn tất cả").check();
  await expect(page.getByRole("button", { name: `Thêm ${found} câu đã chọn` })).toBeEnabled();
  await page.getByLabel("Chọn tất cả").uncheck();
  await expect(page.getByRole("button", { name: "Thêm 0 câu đã chọn" })).toBeDisabled();

  await items.first().locator("input").check();
  await expect(page.getByLabel("Chọn tất cả")).not.toBeChecked();
  await page.getByLabel("Chọn tất cả").check();
  await page.getByRole("button", { name: `Thêm ${found} câu đã chọn` }).click();
  await expect(page.getByText(`Đã thêm ${found} câu hỏi`)).toBeVisible();
  await expect(page.getByText(`Bộ câu hỏi (${found})`)).toBeVisible();

  await page.getByLabel("Tìm câu hỏi").fill("khongcocauhoinaycaxyz");
  await expect(page.getByText(/Không có câu hỏi nào khớp/)).toBeVisible();
  await expect(page.getByLabel("Chọn tất cả")).toHaveCount(0);

  expect(errors).toEqual([]);
});
