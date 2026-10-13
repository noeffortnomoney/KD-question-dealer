import { expect, test, type Page } from "@playwright/test";
import { cleanupTestSessions } from "./db";
import { ADMIN, createSessionViaUi, dealer, login } from "./helpers";

test.afterAll(async () => {
  await cleanupTestSessions();
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

test("tab Tài liệu của buổi training: thêm link, tải file, đổi thứ tự, xóa; đại lý được giao mở được, đại lý khác bị chặn", async ({
  page,
  browser,
}) => {
  const errors = collectErrors(page);
  const title = `Buổi test tài liệu ${Date.now()}`;
  await login(page, ADMIN);
  await createSessionViaUi(page, { title, startMin: 60, endMin: 120, codes: "HCM001" });
  await expect(page.getByText(/Chưa có tài liệu\./)).toBeVisible();

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
  await expect(page.getByRole("link", { name: "Tài liệu (2)" })).toBeVisible();

  await page.locator("div.rounded-xl", { hasText: "File PDF B" }).last().getByRole("button", { name: "Lên" }).click();
  await expect(page.getByText("Đã cập nhật").first()).toBeVisible();
  const titles = page.locator("p.truncate.font-medium");
  await expect(titles.first()).toHaveText("File PDF B");

  const fileHref = (await page
    .locator("div.rounded-xl", { hasText: "File PDF B" })
    .last()
    .getByRole("link", { name: "Mở tài liệu" })
    .getAttribute("href"))!;
  expect((await page.request.get(fileHref)).status()).toBe(200);

  const d1 = await browser.newContext();
  const dealer1 = await d1.newPage();
  await login(dealer1, dealer(1));
  await dealer1.goto("/training-sessions?tab=upcoming");
  const row = dealer1.getByTestId("session-row").filter({ hasText: title });
  await expect(row.getByRole("link", { name: /File PDF B/ })).toHaveAttribute("href", fileHref);
  await expect(row.getByRole("link", { name: /Link tài liệu A/ })).toHaveAttribute("href", "https://example.com/a");
  expect((await dealer1.request.get(fileHref)).status()).toBe(200);
  await d1.close();

  const d2 = await browser.newContext();
  const dealer2 = await d2.newPage();
  await login(dealer2, dealer(2));
  expect((await dealer2.request.get(fileHref)).status()).toBe(404);
  await d2.close();

  await page.locator("div.rounded-xl", { hasText: "Link tài liệu A" }).last().getByRole("button", { name: "Xóa" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xóa" }).click();
  await expect(page.getByText("Link tài liệu A")).toHaveCount(0);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("tab Tài liệu: báo lỗi rõ ràng khi nhập sai", async ({ page }) => {
  const errors = collectErrors(page);
  await login(page, ADMIN);
  await createSessionViaUi(page, { title: `Buổi test lỗi ${Date.now()}`, startMin: 60, endMin: 120, codes: "HCM001" });

  await page.getByRole("button", { name: "Tải file lên" }).click();
  await page.getByRole("button", { name: "Tải lên" }).click();
  await expect(page.getByText("Chọn file cần tải lên")).toBeVisible();

  await page.locator("input[type=file]").setInputFiles({ name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
  await page.getByRole("button", { name: "Tải lên" }).click();
  await expect(page.getByText("Định dạng không được hỗ trợ")).toBeVisible();

  expect(errors.filter((e) => !e.includes("415")), errors.join("\n")).toEqual([]);
});
