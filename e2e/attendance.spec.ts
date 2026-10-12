import { expect, test } from "@playwright/test";
import { cleanupTestCourses, withDb, createSessionFixture } from "./db";
import { ADMIN, dealer, login } from "./helpers";

const stamp = Date.now();
const COURSE = `E2E khóa điểm danh ${stamp}`;
const SESSION = `E2E buổi điểm danh ${stamp}`;

let sessionId = "";

test.beforeAll(async () => {
  await createSessionFixture({
    title: COURSE,
    dealerEmails: ["dealer02@kymdan.local", "dealer03@kymdan.local"],
    sessions: [{ title: SESSION, startOffsetMin: -10, durationMin: 90, meetUrl: "https://meet.google.com/abc-defg-hij" }],
  });
  sessionId = await withDb(async (prisma) => {
    const s = await prisma.trainingSession.findFirstOrThrow({ where: { title: SESSION }, select: { id: true } });
    return s.id;
  });
});

test.afterAll(async () => {
  await cleanupTestCourses();
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
  await page.getByRole("row", { name: new RegExp(SESSION) }).getByRole("link", { name: /1\/2 · Điểm danh/ }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/training-sessions/${sessionId}`, "i"));
  await expect(page.getByRole("heading", { name: `Điểm danh: ${SESSION}` })).toBeVisible();
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

  await page.goto(`/admin/courses/${await withDb(async (p) => (await p.course.findFirstOrThrow({ where: { title: COURSE } })).id)}?tab=sessions`);
  await expect(page.getByRole("link", { name: /1\/2 · Điểm danh/ })).toBeVisible();
});
