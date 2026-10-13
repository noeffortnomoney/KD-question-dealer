import { expect, test } from "@playwright/test";
import { cleanupTestSessions, createSessionFixture } from "./db";
import { ADMIN, dealer, login } from "./helpers";

const stamp = Date.now();
const LIVE = `E2E buổi đang diễn ra ${stamp}`;
const LATER = `E2E buổi chưa tới giờ ${stamp}`;
const MEET_URL = "https://meet.google.com/abc-defg-hij";

test.beforeAll(async () => {
  await createSessionFixture({
    dealerEmails: ["dealer02@kymdan.local"],
    sessions: [
      { title: LIVE, startOffsetMin: -20, durationMin: 120, meetUrl: MEET_URL },
      { title: LATER, startOffsetMin: 180, durationMin: 60, meetUrl: "https://meet.google.com/zzz-zzzz-zzz" },
    ],
  });
});

test.afterAll(async () => {
  await cleanupTestSessions();
});

test("đại lý bấm Tham gia: mở thẳng Google Meet, được điểm danh; buổi chưa tới giờ thì khóa nút", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await login(page, dealer(2));
  await page.goto("/training-sessions?tab=upcoming");

  const live = page.getByTestId("session-row").filter({ hasText: LIVE });
  await expect(live.getByText("Đang diễn ra", { exact: true })).toBeVisible();
  const joinLink = live.getByRole("link", { name: /Tham gia/ });
  await expect(joinLink).toHaveAttribute("href", MEET_URL);
  await expect(joinLink).toHaveAttribute("target", "_blank");

  const later = page.getByTestId("session-row").filter({ hasText: LATER });
  await expect(later.getByRole("button", { name: "Chưa đến giờ" })).toBeDisabled();
  await expect(later.getByRole("link")).toHaveCount(0);

  const popupPromise = context.waitForEvent("page");
  await joinLink.click();
  const popup = await popupPromise;
  await popup.waitForURL(/meet\.google\.com\/abc-defg-hij/, { timeout: 15_000 });
  await popup.close();

  await expect(live.getByText("Đã tham gia")).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByTestId("session-row").filter({ hasText: LIVE }).getByText("Đã tham gia")).toBeVisible();
  expect(errors).toEqual([]);
});

test("admin thấy trạng thái theo giờ thực và số người đã tham gia", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/training-sessions?scope=upcoming");
  const liveRow = page.getByRole("row", { name: new RegExp(LIVE) });
  await expect(liveRow.getByText("Đang diễn ra", { exact: true })).toBeVisible();
  await expect(liveRow.getByTestId("session-joined")).toHaveText("1/1");
  await expect(liveRow.getByRole("link", { name: "Điểm danh" })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(LATER) }).getByText("Sắp diễn ra", { exact: true })).toBeVisible();
});
