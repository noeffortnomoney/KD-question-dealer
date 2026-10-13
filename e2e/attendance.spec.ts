import { expect, test } from "@playwright/test";
import { cleanupTestSessions, createSessionFixture } from "./db";
import { ADMIN, dealer, login } from "./helpers";

const stamp = Date.now();
const SESSION = `E2E buổi điểm danh ${stamp}`;

let sessionId = "";

test.beforeAll(async () => {
  [sessionId] = await createSessionFixture({
    dealerEmails: ["dealer02@kymdan.local", "dealer03@kymdan.local"],
    sessions: [{ title: SESSION, startOffsetMin: -10, durationMin: 90, meetUrl: "https://meet.google.com/abc-defg-hij" }],
  });
});

test.afterAll(async () => {
  await cleanupTestSessions();
});

test("admin xem số lượng và danh sách đại lý đã bấm Tham gia, lọc và xuất Excel", async ({ page, browser }) => {
  const dealerContext = await browser.newContext();
  const dealerPage = await dealerContext.newPage();
  await login(dealerPage, dealer(2));
  await dealerPage.goto("/training-sessions?tab=upcoming");
  const popup = dealerContext.waitForEvent("page");
  await dealerPage.getByTestId("session-row").filter({ hasText: SESSION }).getByRole("link", { name: /Tham gia/ }).click();
  await (await popup).close();
  await expect(dealerPage.getByTestId("session-row").filter({ hasText: SESSION }).getByText("Đã tham gia")).toBeVisible({ timeout: 15_000 });
  await dealerContext.close();

  await login(page, ADMIN);
  await page.goto("/admin/training-sessions?scope=upcoming");
  const row = page.getByRole("row", { name: new RegExp(SESSION) });
  await expect(row.getByTestId("session-joined")).toHaveText("1/2");
  await row.getByRole("link", { name: "Điểm danh", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/training-sessions/${sessionId}`, "i"));
  await expect(page.getByRole("heading", { name: SESSION })).toBeVisible();
  await expect(page.getByText("Đang diễn ra", { exact: true })).toBeVisible();
  await expect(page.getByText(/Tự cập nhật mỗi 30 giây/)).toBeVisible();

  await expect(page.getByRole("link", { name: "Đã tham gia (1)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chưa tham gia (1)" })).toBeVisible();
  await expect(page.getByTestId("attendance-HCM002")).not.toContainText("Chưa tham gia");
  await expect(page.getByTestId("attendance-HN001")).toContainText("Chưa tham gia");

  await page.getByRole("link", { name: "Đã tham gia (1)" }).click();
  await expect(page.getByTestId("attendance-HCM002")).toBeVisible();
  await expect(page.getByTestId("attendance-HN001")).toHaveCount(0);

  await page.getByRole("link", { name: "Chưa tham gia (1)" }).click();
  await expect(page.getByTestId("attendance-HN001")).toBeVisible();
  await expect(page.getByTestId("attendance-HCM002")).toHaveCount(0);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Xuất Excel" }).click();
  expect((await download).suggestedFilename()).toMatch(/^diem-danh-.*\.xlsx$/);
});
