import { expect, test } from "@playwright/test";
import { createTestAdmin, deleteTestUser } from "./db";
import { ADMIN, login } from "./helpers";

const OTHER_ADMIN = { email: "e2e-admin2@kymdan.local", password: "654321" };

test.beforeAll(async () => {
  await createTestAdmin(OTHER_ADMIN.email, OTHER_ADMIN.password);
});

test.afterAll(async () => {
  await deleteTestUser(OTHER_ADMIN.email);
});

test("admin@kymdan.local thấy menu và mở được Audit log", async ({ page }) => {
  await login(page, ADMIN);
  const link = page.getByRole("complementary").getByRole("link", { name: "Audit log" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/admin\/audit-logs/);
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
});

test("quản trị viên khác không có menu Audit log và không mở được trang", async ({ page }) => {
  await login(page, OTHER_ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByRole("link", { name: "Quản lý đại lý" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Audit log" })).toHaveCount(0);

  await page.goto("/admin/audit-logs");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/audit-logs?q=User");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Audit log" })).toHaveCount(0);
});
