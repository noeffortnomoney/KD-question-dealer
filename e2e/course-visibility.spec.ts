import { expect, test, type Page } from "@playwright/test";
import { cleanupTestCourses } from "./db";
import { ADMIN, dealer, login } from "./helpers";

test.afterAll(async () => {
  await cleanupTestCourses();
});

function vnLocal(offsetMinutes: number) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

async function dealerSees(page: Page, courseTitle: string, sessionTitle: string) {
  await page.goto("/courses");
  const course = await page.getByText(courseTitle, { exact: true }).count();
  await page.goto("/training-sessions?tab=all");
  const session = await page.getByText(sessionTitle, { exact: true }).count();
  return { course: course > 0, session: session > 0 };
}

test("khóa học bản nháp: admin được cảnh báo, đại lý không thấy; xuất bản xong đại lý thấy cả khóa học và lịch training", async ({
  page,
  browser,
}) => {
  const stamp = Date.now();
  const courseTitle = `E2E khóa hiển thị ${stamp}`;
  const sessionTitle = `E2E buổi training ${stamp}`;

  await login(page, ADMIN);
  await page.goto("/admin/courses/new");
  await page.locator("form input").first().fill(courseTitle);
  await page.getByRole("button", { name: "Tạo khóa học" }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f-]{36}\?tab=materials/);
  const banner = page.getByTestId("hidden-from-dealers");
  await expect(banner).toContainText("Đại lý chưa nhìn thấy khóa học này");

  await page.getByRole("link", { name: "Lịch training" }).last().click();
  await page.getByRole("button", { name: "Thêm buổi training" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").nth(0).fill(sessionTitle);
  await dialog.locator("input[type=datetime-local]").nth(0).fill(vnLocal(5));
  await dialog.locator("input[type=datetime-local]").nth(1).fill(vnLocal(120));
  await dialog.getByPlaceholder("https://meet.google.com/xxx-xxxx-xxx").fill("https://meet.google.com/abc-defg-hij");
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByText(/Đã lưu lịch training\. Khóa học đang là bản nháp/).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: sessionTitle })).toBeVisible();

  await page.getByRole("link", { name: "Đại lý & tiến độ" }).click();
  await page.getByRole("button", { name: "Giao cho đại lý" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Giao", exact: true }).click();
  await expect(page.getByText(/Đã giao thêm \d+ đại lý\. Khóa học đang là bản nháp/).first()).toBeVisible();

  const dealerContext = await browser.newContext();
  const dealerPage = await dealerContext.newPage();
  await login(dealerPage, dealer(1));
  expect(await dealerSees(dealerPage, courseTitle, sessionTitle)).toEqual({ course: false, session: false });

  await page.goto("/admin/training-sessions?scope=upcoming");
  await expect(page.getByRole("row", { name: new RegExp(sessionTitle) })).toContainText("Khóa học chưa xuất bản");
  await page.goBack();

  await banner.getByRole("button", { name: "Xuất bản ngay" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xuất bản ngay" }).click();
  await expect(page.getByText("Đã xuất bản").first()).toBeVisible();
  await expect(banner).toHaveCount(0);

  expect(await dealerSees(dealerPage, courseTitle, sessionTitle)).toEqual({ course: true, session: true });
  await dealerPage.goto("/training-sessions?tab=upcoming");
  const row = dealerPage.locator("div.rounded-xl", { hasText: sessionTitle }).last();
  await expect(row.getByRole("link", { name: /Tham gia/ })).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");
  await dealerContext.close();
});

test("kỳ thi bản nháp có cảnh báo đại lý chưa thấy", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/exams");
  await page.getByRole("link", { name: "Kỳ thi chính sách bán hàng Q4 (bản nháp)" }).click();
  await expect(page.getByTestId("hidden-from-dealers")).toContainText("Đại lý chưa nhìn thấy kỳ thi này");
});
