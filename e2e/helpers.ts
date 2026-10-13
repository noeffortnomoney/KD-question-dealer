import { expect, type Page } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@kymdan.local",
  password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@123",
};
export const dealer = (n: number) => ({
  email: `dealer0${n}@kymdan.local`,
  password: process.env.E2E_DEALER_PASSWORD ?? "Dealer@123",
});

export function vnLocal(offsetMinutes: number) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

export async function createSessionViaUi(
  page: Page,
  opts: { title: string; startMin: number; endMin: number; codes?: string; meetUrl?: string }
) {
  await page.goto("/admin/training-sessions");
  await page.getByRole("button", { name: "Thêm buổi training" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Tiêu đề/).fill(opts.title);
  await dialog.locator("input[type=datetime-local]").nth(0).fill(vnLocal(opts.startMin));
  await dialog.locator("input[type=datetime-local]").nth(1).fill(vnLocal(opts.endMin));
  await dialog.getByPlaceholder("https://meet.google.com/xxx-xxxx-xxx").fill(opts.meetUrl ?? "https://meet.google.com/abc-defg-hij");
  if (opts.codes) {
    await dialog.getByText("Theo danh sách mã").click();
    await dialog.getByLabel("Mã đại lý").fill(opts.codes);
  }
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await expect(page).toHaveURL(/\/admin\/training-sessions\/[0-9a-f-]{36}\?tab=materials/);
  return page.url().match(/training-sessions\/([0-9a-f-]{36})/i)![1];
}

export async function login(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByPlaceholder("Nhập email của bạn").fill(account.email);
  await page.getByPlaceholder("Nhập mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
