import { expect, test, type Page } from "@playwright/test";
import { cleanupTestSessions } from "./db";
import { ADMIN, createSessionViaUi, dealer, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const SESSION = `E2E buổi thông báo ${stamp}`;
let sessionId = "";

test.afterAll(async () => {
  await cleanupTestSessions();
});

async function openBell(page: Page) {
  await page.getByTestId("notification-bell").click();
  const panel = page.getByTestId("notification-panel");
  await expect(panel).toBeVisible();
  return panel;
}

test("đại lý được giao nhận thông báo lịch training mới + nhắc sắp bắt đầu, bấm để mở, đánh dấu đã đọc", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);
  sessionId = await createSessionViaUi(admin, { title: SESSION, startMin: 20, endMin: 80, codes: "HCM002" });
  await adminCtx.close();

  await login(page, dealer(2));
  await expect(page.getByTestId("notification-count")).toBeVisible();

  let panel = await openBell(page);
  const newItem = panel.getByTestId("notification-item").filter({ hasText: `Lịch training mới: ${SESSION}` });
  await expect(newItem).toBeVisible();
  await expect(newItem.getByLabel("Chưa đọc")).toBeVisible();
  await expect(panel.getByTestId("notification-item").filter({ hasText: `Buổi training sắp bắt đầu: ${SESSION}` })).toBeVisible();

  await newItem.click();
  await expect(page).toHaveURL(/\/training-sessions/);
  await expect(page.getByTestId("session-row").filter({ hasText: SESSION })).toBeVisible();

  panel = await openBell(page);
  await expect(panel.getByTestId("notification-item").filter({ hasText: `Lịch training mới: ${SESSION}` }).getByLabel("Chưa đọc")).toHaveCount(0);

  await panel.getByRole("button", { name: /Đánh dấu tất cả đã đọc/ }).click();
  await expect(page.getByTestId("notification-count")).toHaveCount(0);
  await expect(panel.getByLabel("Chưa đọc")).toHaveCount(0);

  await panel.getByRole("link", { name: "Xem tất cả" }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading", { name: "Thông báo" })).toBeVisible();
  await expect(page.getByText(`Lịch training mới: ${SESSION}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("đại lý không được giao thì không nhận thông báo", async ({ page }) => {
  await login(page, dealer(3));
  const panel = await openBell(page);
  await expect(panel.getByTestId("notification-item").filter({ hasText: SESSION })).toHaveCount(0);
});

test("đại lý nhận thông báo lịch training thay đổi", async ({ page, browser }) => {
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);
  await admin.goto("/admin/training-sessions?scope=upcoming");
  await admin.getByRole("row", { name: new RegExp(SESSION) }).getByRole("button", { name: "Sửa" }).click();
  await admin.getByRole("dialog").getByPlaceholder("VD: Phòng Kinh doanh").fill("Phòng Kinh doanh E2E");
  await admin.getByRole("dialog").getByRole("button", { name: "Lưu" }).click();
  await expect(admin.getByText("Đã lưu lịch training").first()).toBeVisible();
  await adminCtx.close();

  await login(page, dealer(2));
  const panel = await openBell(page);
  const item = panel.getByTestId("notification-item").filter({ hasText: `Lịch training thay đổi: ${SESSION}` });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(/\/training-sessions/);
});

test("quản trị viên nhận nhắc buổi training sắp bắt đầu, bấm mở trang điểm danh", async ({ page }) => {
  await login(page, ADMIN);
  const panel = await openBell(page);
  const item = panel.getByTestId("notification-item").filter({ hasText: SESSION }).filter({ hasText: "Sắp bắt đầu" });
  await expect(item).toBeVisible();
  await item.click();
  await expect(page).toHaveURL(new RegExp(`/admin/training-sessions/${sessionId}`, "i"));
  await expect(page.getByRole("heading", { name: SESSION })).toBeVisible();
});

test("phòng thi không hiển thị chuông", async ({ page }) => {
  await login(page, dealer(1));
  await page.goto("/my-results");
  await expect(page.getByTestId("notification-bell")).toBeVisible();
  const resultLink = page.getByRole("link", { name: "Chi tiết" }).first();
  if (await resultLink.count()) {
    await resultLink.click();
    await expect(page).toHaveURL(/\/attempts\/.+\/result/);
    await expect(page.getByTestId("notification-bell")).toHaveCount(0);
  }
});
