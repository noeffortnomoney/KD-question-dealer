import { expect, test, type Page } from "@playwright/test";
import { cleanupTestSessions } from "./db";
import { ADMIN, createSessionViaUi, dealer, login } from "./helpers";

test.afterAll(async () => {
  await cleanupTestSessions();
});

async function dealerSees(page: Page, sessionTitle: string) {
  await page.goto("/training-sessions?tab=all");
  return (await page.getByTestId("session-row").filter({ hasText: sessionTitle }).count()) > 0;
}

test("lịch training chỉ hiện cho đại lý được giao; giao thêm và bỏ giao có hiệu lực ngay", async ({ page, browser }) => {
  const sessionTitle = `E2E buổi hiển thị ${Date.now()}`;

  await login(page, ADMIN);
  const sessionId = await createSessionViaUi(page, { title: sessionTitle, startMin: 5, endMin: 120, codes: "HCM001" });
  await expect(page.getByText(/Đã tạo lịch training · 1 đại lý được giao/).first()).toBeVisible();

  const d1 = await browser.newContext();
  const dealer1 = await d1.newPage();
  await login(dealer1, dealer(1));
  const d2 = await browser.newContext();
  const dealer2 = await d2.newPage();
  await login(dealer2, dealer(2));

  expect(await dealerSees(dealer1, sessionTitle)).toBe(true);
  expect(await dealerSees(dealer2, sessionTitle)).toBe(false);
  await dealer1.goto("/training-sessions?tab=upcoming");
  await expect(
    dealer1.getByTestId("session-row").filter({ hasText: sessionTitle }).getByRole("link", { name: /Tham gia/ })
  ).toHaveAttribute("href", "https://meet.google.com/abc-defg-hij");

  await page.goto(`/admin/training-sessions/${sessionId}`);
  await page.getByRole("button", { name: "Giao cho đại lý" }).click();
  await page.getByRole("dialog").getByText("Theo danh sách mã").click();
  await page.getByRole("dialog").locator("textarea").fill("HCM002");
  await page.getByRole("dialog").getByRole("button", { name: "Giao", exact: true }).click();
  await expect(page.getByText("Đã giao thêm 1 đại lý").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Đại lý & điểm danh (2)" })).toBeVisible();
  expect(await dealerSees(dealer2, sessionTitle)).toBe(true);

  await page.getByTestId("attendance-HCM001").getByRole("button", { name: "Bỏ giao" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bỏ giao" }).click();
  await expect(page.getByTestId("attendance-HCM001")).toHaveCount(0);
  expect(await dealerSees(dealer1, sessionTitle)).toBe(false);

  await d1.close();
  await d2.close();
});

test("buổi training chưa giao cho ai: admin được cảnh báo ở danh sách", async ({ page }) => {
  const sessionTitle = `E2E buổi chưa giao ${Date.now()}`;
  await login(page, ADMIN);
  await createSessionViaUi(page, { title: sessionTitle, startMin: 60, endMin: 120, codes: "KHONGTONTAI" });
  await expect(page.getByText(/0 đại lý được giao\. Không tìm thấy: KHONGTONTAI/).first()).toBeVisible();
  await page.goto("/admin/training-sessions?scope=upcoming");
  await expect(page.getByRole("row", { name: new RegExp(sessionTitle) })).toContainText("Chưa giao cho đại lý nào");
});

test("kỳ thi bản nháp có cảnh báo đại lý chưa thấy", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/exams");
  await page.getByRole("link", { name: "Kỳ thi chính sách bán hàng Q4 (bản nháp)" }).click();
  await expect(page.getByTestId("hidden-from-dealers")).toContainText("Đại lý chưa nhìn thấy kỳ thi này");
});
