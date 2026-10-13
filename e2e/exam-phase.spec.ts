import { expect, test } from "@playwright/test";
import { cleanupTestExams, withDb } from "./db";
import { ADMIN, login } from "./helpers";

const TITLE = `E2E kỳ thi quá giờ ${Date.now()}`;
let examId = "";

test.beforeAll(async () => {
  examId = await withDb(async (prisma) => {
    const now = Date.now();
    const exam = await prisma.exam.create({
      data: {
        title: TITLE,
        status: "published",
        startsAt: new Date(now - 2 * 86_400_000),
        endsAt: new Date(now - 86_400_000),
      },
      select: { id: true },
    });
    return exam.id;
  });
});

test.afterAll(async () => {
  await cleanupTestExams();
});

test("kỳ thi đã xuất bản nhưng quá giờ đóng: hiển thị 'Hết giờ · chưa đóng', lọc được, đóng xong thành 'Đã đóng'", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/exams");
  const row = page.getByRole("row", { name: new RegExp(TITLE) });
  await expect(row).toContainText("Hết giờ · chưa đóng");
  await expect(row).not.toContainText("Đang mở");

  await page.getByLabel("Chưa lưu trữ").selectOption("ended");
  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page).toHaveURL(/status=ended/);
  await expect(page.getByRole("row", { name: new RegExp(TITLE) })).toBeVisible();
  for (const text of await page.locator("tbody tr td:nth-child(8)").allInnerTexts()) expect(text).toContain("Hết giờ · chưa đóng");

  await page.getByLabel("Chưa lưu trữ").selectOption("open");
  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page.getByRole("row", { name: new RegExp(TITLE) })).toHaveCount(0);

  await page.goto(`/admin/exams/${examId}`);
  const banner = page.getByTestId("exam-ended-banner");
  await expect(banner).toContainText("Kỳ thi đã hết giờ lúc");
  await banner.getByRole("button", { name: "Đóng kỳ thi ngay" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Đóng kỳ thi" }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByText("Đã đóng", { exact: true }).first()).toBeVisible();
});
