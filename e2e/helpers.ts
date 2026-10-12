import { expect, type Page } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@kymdan.local",
  password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@123",
};
export const dealer = (n: number) => ({
  email: `dealer0${n}@kymdan.local`,
  password: process.env.E2E_DEALER_PASSWORD ?? "Dealer@123",
});

export async function login(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByPlaceholder("Nhập email của bạn").fill(account.email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
