import { expect, test } from "@playwright/test";
import ExcelJS from "exceljs";
import { cleanupTestQuestions } from "./db";
import { ADMIN, login } from "./helpers";

const stamp = Date.now();
const NEW_CATEGORY = `E2E chủ đề ${stamp}`;
const Q1 = `E2E câu hỏi một ${stamp}`;
const Q2 = `E2E câu hỏi hai ${stamp}`;

test.afterAll(async () => {
  await cleanupTestQuestions();
});

test("import câu hỏi: tải file mẫu, điền, xem trước báo lỗi theo dòng, xác nhận, chặn import trùng", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/questions");
  await page.getByRole("link", { name: "Import Excel/CSV" }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/import$/);

  const templateRes = await page.request.get("/api/admin/questions/import/template");
  expect(templateRes.status()).toBe(200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await templateRes.body()) as unknown as ArrayBuffer);
  expect(workbook.worksheets.map((w) => w.name)).toEqual(["Cau hoi", "Huong dan"]);
  const sheet = workbook.getWorksheet("Cau hoi")!;
  expect(sheet.getRow(1).values).toEqual(
    expect.arrayContaining(["Chủ đề", "Nội dung câu hỏi", "Đáp án A", "Đáp án B", "Đáp án đúng", "Giải thích", "Độ khó"])
  );
  const existingCategory = String(sheet.getRow(2).getCell(1).value);

  const filledRows = [
    [existingCategory, Q1, "Lựa chọn một", "Lựa chọn hai", "", "", "", "", "A", "Giải thích câu một", "Dễ"],
    [NEW_CATEGORY, Q2, "X", "Y", "Z", "", "", "", "c", "", "Khó"],
    [existingCategory, `E2E câu lỗi ${stamp}`, "Một", "Hai", "", "", "", "", "D", "", ""],
    [existingCategory, Q1, "Lựa chọn một", "Lựa chọn hai", "", "", "", "", "A", "", ""],
  ];
  filledRows.forEach((values, i) => {
    const row = sheet.getRow(i + 2);
    values.forEach((v, c) => {
      row.getCell(c + 1).value = v || null;
    });
    row.commit();
  });
  const filled = Buffer.from((await workbook.xlsx.writeBuffer()) as ArrayBuffer);
  const upload = { name: "cau-hoi.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: filled };

  await page.locator("input[type=file]").setInputFiles(upload);
  await page.getByRole("button", { name: /Tải lên & kiểm tra/ }).click();
  await expect(page.getByText("Tổng số câu")).toBeVisible();
  await expect(page.getByText(`Sẽ tạo 1 chủ đề mới: ${NEW_CATEGORY}`)).toBeVisible();
  await expect(page.getByTestId("qrow-2")).toContainText("Hợp lệ");
  await expect(page.getByTestId("qrow-3")).toContainText("mới");
  await expect(page.getByTestId("qrow-3")).toContainText("Hợp lệ");
  await expect(page.getByTestId("qrow-4")).toContainText("ô Đáp án D trống");
  await expect(page.getByTestId("qrow-5")).toContainText("Trùng với câu hỏi ở dòng 2");

  const errDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Tải file dòng lỗi/ }).click();
  expect((await errDownload).suggestedFilename()).toBe("dong-loi-import-cau-hoi.csv");

  await page.getByText("Xuất bản ngay sau khi import").click();
  await page.getByRole("button", { name: "Xác nhận import" }).click();
  await expect(page.getByText("Đã import 2 câu hỏi").first()).toBeVisible();
  await expect(page.getByText(`Chủ đề mới: ${NEW_CATEGORY}`)).toBeVisible();

  await page.goto(`/admin/questions?q=${encodeURIComponent(`E2E câu hỏi`)}`);
  await expect(page.getByRole("link", { name: Q1 })).toBeVisible();
  await expect(page.getByRole("link", { name: Q2 })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(Q2) })).toContainText("Khó");
  await expect(page.getByRole("row", { name: new RegExp(Q2) })).toContainText("Đã xuất bản");

  await page.getByRole("link", { name: Q2 }).click();
  await expect(page.getByLabel("Đáp án đúng C")).toBeChecked();

  await page.goto("/admin/questions/import");
  await page.locator("input[type=file]").setInputFiles(upload);
  await page.getByRole("button", { name: /Tải lên & kiểm tra/ }).click();
  await expect(page.getByTestId("qrow-2")).toContainText("Câu hỏi đã tồn tại trong chủ đề này");
  await expect(page.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
});

test("import câu hỏi: báo lỗi khi file sai định dạng hoặc thiếu cột", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/questions/import");
  await page.locator("input[type=file]").setInputFiles({ name: "sai.csv", mimeType: "text/csv", buffer: Buffer.from("Chủ đề,Nội dung câu hỏi\nA,B", "utf8") });
  await page.getByRole("button", { name: /Tải lên & kiểm tra/ }).click();
  await expect(page.getByText(/Thiếu cột bắt buộc: Đáp án A, Đáp án B, Đáp án đúng/)).toBeVisible();
});
