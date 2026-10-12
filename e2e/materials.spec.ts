import { expect, test, type Page } from "@playwright/test";
import { cleanupTestCourses } from "./db";
import { ADMIN, login } from "./helpers";

test.afterAll(async () => {
  await cleanupTestCourses();
});

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && res.status() !== 415) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  return errors;
}

async function createCourse(page: Page, title: string) {
  await page.goto("/admin/courses/new");
  await page.locator("form input").first().fill(title);
  await page.getByRole("button", { name: "Tạo khóa học" }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f-]{36}\?tab=materials/);
}

test("tab Tài liệu: thêm link, tải file, bắt buộc, đổi thứ tự, xóa — không có lỗi", async ({ page }) => {
  const errors = collectErrors(page);
  await login(page, ADMIN);
  await createCourse(page, `Khóa test tài liệu ${Date.now()}`);
  await expect(page.getByText("Chưa có tài liệu.")).toBeVisible();

  await page.getByLabel(/^Tiêu đề/).fill("Link tài liệu A");
  await page.getByPlaceholder("https://").fill("https://example.com/a");
  await page.getByRole("button", { name: "Thêm tài liệu" }).click();
  await expect(page.getByText("Link tài liệu A")).toBeVisible();

  await page.getByRole("button", { name: "Tải file lên" }).click();
  await page.getByLabel(/^Tiêu đề/).fill("File PDF B");
  await page.locator("input[type=file]").setInputFiles({
    name: "tai-lieu-b.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
  });
  await page.getByRole("button", { name: "Tải lên" }).click();
  await expect(page.getByText("File PDF B")).toBeVisible();
  await expect(page.getByText(/tai-lieu-b\.pdf/)).toBeVisible();

  const rowB = page.locator("div.rounded-xl", { hasText: "File PDF B" }).last();
  await rowB.getByRole("checkbox").check();
  await expect(page.getByText("Đã cập nhật").first()).toBeVisible();
  await page.reload();
  await expect(page.locator("div.rounded-xl", { hasText: "File PDF B" }).last().getByRole("checkbox")).toBeChecked();

  await page.locator("div.rounded-xl", { hasText: "File PDF B" }).last().getByRole("button", { name: "Lên" }).click();
  await expect(page.getByText("Đã cập nhật").first()).toBeVisible();
  const titles = page.locator("p.truncate.font-medium");
  await expect(titles.first()).toHaveText("File PDF B");

  const download = await page.request.get(
    (await page.locator("div.rounded-xl", { hasText: "File PDF B" }).last().getByRole("link", { name: "Mở tài liệu" }).getAttribute("href"))!
  );
  expect(download.status()).toBe(200);

  await page.locator("div.rounded-xl", { hasText: "Link tài liệu A" }).last().getByRole("button", { name: "Xóa" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa" }).click();
  await expect(page.getByText("Link tài liệu A")).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("tab Tài liệu: báo lỗi rõ ràng khi nhập sai", async ({ page }) => {
  const errors = collectErrors(page);
  await login(page, ADMIN);
  await createCourse(page, `Khóa test lỗi ${Date.now()}`);

  await page.getByRole("button", { name: "Tải file lên" }).click();
  await page.getByRole("button", { name: "Tải lên" }).click();
  await expect(page.getByText("Chọn file cần tải lên")).toBeVisible();

  await page.locator("input[type=file]").setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
  await page.getByRole("button", { name: "Tải lên" }).click();
  await expect(page.getByText("Định dạng không được hỗ trợ")).toBeVisible();

  expect(errors.filter((e) => !e.includes("415")), errors.join("\n")).toEqual([]);
});
