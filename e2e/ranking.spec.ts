import { expect, test } from "@playwright/test";
import { cleanupTestExams, createRankingFixture, withDb } from "./db";
import { ADMIN, dealer, login } from "./helpers";

const TITLE = `E2E kỳ thi xếp hạng ${Date.now()}`;
let examId = "";

test.beforeAll(async () => {
  await cleanupTestExams();
  examId = await createRankingFixture(
    TITLE,
    [
      { email: "dealer01@kymdan.local", score: 90, minutes: 30 },
      { email: "dealer02@kymdan.local", score: 90, minutes: 25 },
      { email: "dealer03@kymdan.local", score: 70, minutes: 20 },
      { email: "dealer04@kymdan.local", score: 100, minutes: 10, status: "Voided" },
    ],
    ["dealer01@kymdan.local", "dealer02@kymdan.local", "dealer03@kymdan.local", "dealer04@kymdan.local", "dealer05@kymdan.local"]
  );
});

test.afterAll(async () => {
  await cleanupTestExams();
});

test("admin: bảng xếp hạng đầy đủ, bằng điểm thì nhanh hơn xếp trên, bỏ lượt đã hủy, lọc khu vực, xuất Excel", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto(`/admin/exams/${examId}?tab=ranking`);
  await expect(page.getByText("Kết quả chính thức — kỳ thi đã kết thúc")).toBeVisible();
  await expect(page.getByTestId("rank-HCM002").getByRole("cell").first()).toHaveText("1");
  await expect(page.getByTestId("rank-HCM001").getByRole("cell").first()).toHaveText("2");
  await expect(page.getByTestId("rank-HN001").getByRole("cell").first()).toHaveText("3");
  await expect(page.getByTestId("rank-DN001")).toHaveCount(0);
  await expect(page.getByText("5 đại lý được giao").first()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Xuất Excel" }).click();
  expect((await download).suggestedFilename()).toMatch(/^xep-hang-.*\.xlsx$/);

  await page.getByLabel("Toàn quốc").selectOption("Hà Nội");
  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page.getByText("Đang xếp hạng trong khu vực")).toBeVisible();
  await expect(page.getByTestId("rank-HN001").getByRole("cell").first()).toHaveText("1");
  await expect(page.getByTestId("rank-HCM002")).toHaveCount(0);

  await page.goto(`/admin/reports?exam=${examId}`);
  await page.getByRole("link", { name: "Bảng xếp hạng" }).click();
  await expect(page).toHaveURL(/tab=ranking/);
});

test("đại lý: xem hạng của mình và top 10 khi được công khai; chỉ thấy hạng mình khi tắt công khai", async ({ page }) => {
  await login(page, dealer(1));
  await page.goto("/exams");
  await page.locator(`[data-exam-card="${TITLE}"]`).getByRole("link", { name: "Xếp hạng" }).click();
  await expect(page).toHaveURL(new RegExp(`/exams/${examId}/ranking`, "i"));
  const mine = page.getByTestId("my-rank");
  await expect(mine).toContainText("2/3");
  await expect(mine).toContainText("90/100");
  await expect(page.getByTestId("top-row")).toHaveCount(3);
  await expect(page.getByTestId("top-row").filter({ hasText: "(bạn)" })).toContainText("2");
  await expect(page.getByText("HCM002")).toHaveCount(0);

  await withDb((p) => p.exam.update({ where: { id: examId }, data: { showLeaderboard: false } }));
  await page.reload();
  await expect(page.getByTestId("my-rank")).toContainText("2/3");
  await expect(page.getByTestId("leaderboard-private")).toBeVisible();
  await expect(page.getByTestId("top-row")).toHaveCount(0);
  await withDb((p) => p.exam.update({ where: { id: examId }, data: { showLeaderboard: true } }));
});

test("đại lý không thi thì không có xếp hạng; kỳ thi chưa kết thúc thì chưa xem được", async ({ page, browser }) => {
  const ctx5 = await browser.newContext();
  const page5 = await ctx5.newPage();
  await login(page5, dealer(5));
  await page5.goto(`/exams/${examId}/ranking`);
  await expect(page5.getByText("Bạn không có bài thi được chấm trong kỳ thi này")).toBeVisible();
  await ctx5.close();

  await withDb((p) =>
    p.exam.update({ where: { id: examId }, data: { status: "published", endsAt: new Date(Date.now() + 86_400_000) } })
  );
  await login(page, dealer(1));
  await page.goto(`/exams/${examId}/ranking`);
  await expect(page.getByText(/Bảng xếp hạng sẽ có sau khi kỳ thi kết thúc/)).toBeVisible();
  await page.goto("/exams");
  await expect(page.locator(`[data-exam-card="${TITLE}"]`).getByRole("link", { name: "Xếp hạng" })).toHaveCount(0);
});
