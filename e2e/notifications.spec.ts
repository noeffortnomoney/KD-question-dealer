import { expect, test, type Page } from "@playwright/test";
import { cleanupTestCourses, createSessionFixture, withDb } from "./db";
import { ADMIN, dealer, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const COURSE = `E2E khóa thông báo ${stamp}`;
const SESSION = `E2E buổi thông báo ${stamp}`;
let courseId = "";
let sessionId = "";

test.beforeAll(async () => {
  const course = await createSessionFixture({
    title: COURSE,
    status: "draft",
    dealerEmails: ["dealer02@kymdan.local"],
    sessions: [{ title: SESSION, startOffsetMin: 20, durationMin: 60, meetUrl: "https://meet.google.com/abc-defg-hij" }],
  });
  courseId = course.id;
  sessionId = await withDb(async (p) => (await p.trainingSession.findFirstOrThrow({ where: { title: SESSION } })).id);
});

test.afterAll(async () => {
  await cleanupTestCourses();
});

async function openBell(page: Page) {
  await page.getByTestId("notification-bell").click();
  const panel = page.getByTestId("notification-panel");
  await expect(panel).toBeVisible();
  return panel;
}

test("đại lý nhận thông báo khóa học mới + nhắc buổi training, bấm để mở, đánh dấu đã đọc", async ({ page, browser }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);
  await admin.goto(`/admin/courses/${courseId}?tab=info`);
  await admin.getByTestId("hidden-from-dealers").getByRole("button", { name: "Xuất bản ngay" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Xuất bản ngay" }).click();
  await expect(admin.getByText("Đã xuất bản").first()).toBeVisible();
  await adminCtx.close();

  await login(page, dealer(2));
  await expect(page.getByTestId("notification-count")).toBeVisible();

  let panel = await openBell(page);
  const courseItem = panel.getByTestId("notification-item").filter({ hasText: `Khóa học mới: ${COURSE}` });
  await expect(courseItem).toBeVisible();
  await expect(courseItem.getByLabel("Chưa đọc")).toBeVisible();
  await expect(panel.getByTestId("notification-item").filter({ hasText: `Buổi training sắp bắt đầu: ${SESSION}` })).toBeVisible();

  await courseItem.click();
  await expect(page).toHaveURL(new RegExp(`/courses/${courseId}`, "i"));
  await expect(page.getByRole("heading", { name: COURSE })).toBeVisible();

  panel = await openBell(page);
  await expect(panel.getByTestId("notification-item").filter({ hasText: `Khóa học mới: ${COURSE}` }).getByLabel("Chưa đọc")).toHaveCount(0);

  await panel.getByRole("button", { name: /Đánh dấu tất cả đã đọc/ }).click();
  await expect(page.getByTestId("notification-count")).toHaveCount(0);
  await expect(panel.getByLabel("Chưa đọc")).toHaveCount(0);

  await panel.getByRole("link", { name: "Xem tất cả" }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole("heading", { name: "Thông báo" })).toBeVisible();
  await expect(page.getByText(`Khóa học mới: ${COURSE}`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("đại lý nhận thông báo lịch training thay đổi", async ({ page, browser }) => {
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);
  await admin.goto(`/admin/courses/${courseId}?tab=sessions`);
  await admin.getByRole("row", { name: new RegExp(SESSION) }).getByRole("button", { name: "Sửa" }).click();
  await admin.getByRole("dialog").getByPlaceholder("VD: Phòng Đào tạo").fill("Phòng Đào tạo E2E");
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
  await expect(page.getByRole("heading", { name: `Điểm danh: ${SESSION}` })).toBeVisible();
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
