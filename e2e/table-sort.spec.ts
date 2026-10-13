import { expect, test } from "@playwright/test";
import { cleanupTestDealers, createTestDealers } from "./db";
import { ADMIN, dealer, login } from "./helpers";

const PREFIX = "E2ESRT";

test.beforeAll(async () => {
  await cleanupTestDealers(PREFIX);
  await createTestDealers(PREFIX, 12);
});

test.afterAll(async () => {
  await cleanupTestDealers(PREFIX);
});

test("bấm tiêu đề cột để sắp xếp tăng/giảm, giữ khi lọc, về trang 1", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto(`/admin/dealers?q=${PREFIX}&page=2`);
  const firstCode = page.locator("tbody tr").first().locator("td").nth(1);
  const codeHead = page.locator("thead th", { has: page.getByTestId("sort-code") });
  const createdHead = page.locator("thead th", { has: page.getByTestId("sort-createdAt") });

  await expect(createdHead).toHaveAttribute("aria-sort", "descending");
  await expect(codeHead).toHaveAttribute("aria-sort", "none");
  await expect(page.getByTestId("sort-name")).toHaveAttribute("aria-label", "Sắp xếp theo Tên đại lý tăng dần");

  await page.getByTestId("sort-code").click();
  await expect(page).toHaveURL(/sort=code&dir=asc/);
  await expect(page).not.toHaveURL(/page=/);
  await expect(codeHead).toHaveAttribute("aria-sort", "ascending");
  await expect(firstCode).toHaveText(`${PREFIX}001`);

  await page.getByTestId("sort-code").click();
  await expect(page).toHaveURL(/dir=desc/);
  await expect(codeHead).toHaveAttribute("aria-sort", "descending");
  await expect(firstCode).toHaveText(`${PREFIX}012`);

  await page.getByTestId("sort-name").click();
  await expect(page).toHaveURL(/sort=name&dir=asc/);
  await expect(codeHead).toHaveAttribute("aria-sort", "none");
  await expect(page.locator("tbody tr").first()).toContainText(/phân trang 1$|phân trang 1C/);
  await page.getByTestId("sort-name").click();
  await expect(page).toHaveURL(/sort=name&dir=desc/);
  await expect(page.locator("tbody tr").first()).toContainText("phân trang 9");

  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page).toHaveURL(/sort=name/);
  await expect(page.locator("tbody tr").first()).toContainText("phân trang 9");

  await page.goto(`/admin/dealers?q=${PREFIX}&sort=passwordHash&dir=asc`);
  await expect(createdHead).toHaveAttribute("aria-sort", "descending");
});

test("mặc định các bảng quản trị: mới nhất lên đầu", async ({ page }) => {
  await login(page, ADMIN);
  const newestFirst = async (path: string, column: string) => {
    await page.goto(path);
    if ((await page.locator("tbody tr").count()) === 0) return;
    await expect(page.locator("thead th", { has: page.getByTestId(`sort-${column}`) })).toHaveAttribute("aria-sort", "descending");
  };
  await newestFirst("/admin/dealers", "createdAt");
  await newestFirst("/admin/exams", "created");
  await newestFirst("/admin/questions", "created");
  await newestFirst("/admin/training-sessions?scope=all", "createdAt");
  await newestFirst("/admin/reports", "startedAt");

  await page.goto("/admin/dealers");
  const created = await page.locator("tbody tr td:nth-child(8)").allInnerTexts();
  const toTime = (t: string) => {
    const [hm, dmy] = t.trim().split(" ");
    const [d, m, y] = dmy.split("/").map(Number);
    const [h, mi] = hm.split(":").map(Number);
    return new Date(y, m - 1, d, h, mi).getTime();
  };
  const times = created.map(toTime);
  expect(times).toEqual([...times].sort((a, b) => b - a));
});

test("quản lý kỳ thi: lịch thi và cấu hình 2 dòng có icon, sắp xếp theo số câu", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/exams");
  const row = page.getByRole("row", { name: /Kỳ thi kiến thức sản phẩm \(demo\)/ });
  await expect(row).toContainText("30 câu · 45 phút");
  await expect(row).toContainText("Đạt 70%");
  await expect(row).toContainText("→");
  await expect(row.locator("svg.lucide-calendar-days")).toHaveCount(1);
  await expect(row.locator("svg.lucide-file-text")).toHaveCount(1);

  await page.getByTestId("sort-questions").click();
  await expect(page).toHaveURL(/sort=questions&dir=desc/);
  const counts = await page.locator("tbody tr td:nth-child(5)").allInnerTexts();
  const nums = counts.map((t) => Number(t.trim()));
  expect(nums).toEqual([...nums].sort((a, b) => b - a));
});

test("kết quả của tôi (đại lý) sắp xếp được theo điểm", async ({ page }) => {
  await login(page, dealer(1));
  await page.goto("/my-results");
  if ((await page.locator("tbody tr").count()) === 0) return;
  await page.getByTestId("sort-score").click();
  await expect(page).toHaveURL(/sort=score&dir=desc/);
  await expect(page.locator("thead th", { has: page.getByTestId("sort-score") })).toHaveAttribute("aria-sort", "descending");
});
