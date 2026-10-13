import { expect, test, type Page } from "@playwright/test";
import { cleanupTestDealerAccounts } from "./db";
import { ADMIN, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const CODE = "E2EPW01";
const EMAIL = "e2epw01@kymdan.local";

test.beforeAll(async () => {
  await cleanupTestDealerAccounts("E2EPW");
});

test.afterAll(async () => {
  await cleanupTestDealerAccounts("E2EPW");
});

async function changePassword(page: Page, current: string, next: string) {
  await page.locator("input[type=password]").nth(0).fill(current);
  await page.locator("input[type=password]").nth(1).fill(next);
  await page.locator("input[type=password]").nth(2).fill(next);
  await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
}

test("tài khoản mới có mật khẩu mặc định 123456, đổi mật khẩu chỉ cần 6 ký tự", async ({ page, browser }) => {
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);
  await admin.goto("/admin/dealers");
  await admin.getByRole("button", { name: "Thêm đại lý" }).click();
  const dialog = admin.getByRole("dialog");
  await expect(dialog.getByText("mật khẩu mặc định 123456")).toBeVisible();
  await dialog.getByPlaceholder("VD: HCM001").fill(CODE);
  await dialog.getByPlaceholder("Nhập tên đại lý").fill("E2E đại lý mật khẩu");
  await dialog.getByPlaceholder("Nhập họ và tên").fill("E2E người dùng");
  await dialog.getByPlaceholder("Nhập email").fill(EMAIL);
  await dialog.getByRole("button", { name: "Lưu" }).click();
  await dialog.getByRole("button", { name: "Xác nhận" }).click();
  await expect(dialog.getByTestId("temp-password")).toHaveText("123456");
  await adminCtx.close();

  await login(page, { email: EMAIL, password: "123456" });
  await expect(page).toHaveURL(/\/change-password/);
  await expect(page.getByText("Tối thiểu 6 ký tự")).toBeVisible();

  await changePassword(page, "123456", "12345");
  await expect(page.getByText("Mật khẩu tối thiểu 6 ký tự")).toBeVisible();
  await expect(page).toHaveURL(/\/change-password/);

  await changePassword(page, "123456", "654321");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("import đại lý: file mẫu không còn cột mật khẩu, file cũ có cột đó vẫn dùng mật khẩu mặc định 123456", async ({ page, browser }) => {
  const ExcelJS = (await import("exceljs")).default;
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);

  const template = await admin.request.get("/api/admin/dealers/import/template");
  expect(template.ok()).toBe(true);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await template.body()) as unknown as ArrayBuffer);
  const headers = (wb.worksheets[0].getRow(1).values as unknown[]).filter(Boolean).map(String);
  expect(headers).toEqual(["Mã đại lý", "Tên đại lý", "Họ tên người dùng", "Email đăng nhập", "Số điện thoại", "Khu vực"]);

  await admin.goto("/admin/dealers/import");
  await expect(admin.getByText("mật khẩu mặc định")).toBeVisible();
  const csv = [
    "Mã đại lý,Tên đại lý,Họ tên người dùng,Email đăng nhập,Số điện thoại,Khu vực,Mật khẩu tạm",
    "E2EPW02,E2E đại lý import,E2E người import,e2epw02@kymdan.local,,E2E,abcdef",
  ].join("\n");
  await admin.locator("input[type=file]").setInputFiles({ name: "cu.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf8") });
  await admin.getByRole("button", { name: /Tải lên & kiểm tra/ }).click();
  await admin.getByRole("button", { name: "Xác nhận import" }).click();
  await expect(admin.getByRole("main").getByText("Đã tạo 1 đại lý")).toBeVisible();
  await expect(admin.getByTestId("import-default-password")).toContainText("123456");
  await adminCtx.close();

  await login(page, { email: "e2epw02@kymdan.local", password: "123456" });
  await expect(page).toHaveURL(/\/change-password/);
});

test("quản trị viên cấp lại mật khẩu: điền sẵn 123456, tự đặt được mật khẩu tối thiểu 6 ký tự", async ({ page, browser }) => {
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await login(admin, ADMIN);
  await admin.goto(`/admin/dealers?q=${CODE}`);
  await admin.getByRole("row", { name: new RegExp(CODE) }).getByRole("button", { name: "Cấp lại mật khẩu" }).click();
  const dialog = admin.getByRole("dialog");
  const input = dialog.getByLabel("Mật khẩu mới");
  await expect(input).toHaveValue("123456");

  await input.fill("abc12");
  await dialog.getByRole("button", { name: "Cấp lại mật khẩu" }).click();
  await expect(dialog.getByText("Mật khẩu tối thiểu 6 ký tự")).toBeVisible();

  await input.fill("abcxyz");
  await dialog.getByRole("button", { name: "Cấp lại mật khẩu" }).click();
  await expect(dialog.getByTestId("temp-password")).toHaveText("abcxyz");
  await adminCtx.close();

  await login(page, { email: EMAIL, password: "abcxyz" });
  await expect(page).toHaveURL(/\/change-password/);
  await changePassword(page, "abcxyz", "999999");
  await expect(page).toHaveURL(/\/dashboard/);
});
