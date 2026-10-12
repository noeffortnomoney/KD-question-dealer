import { describe, expect, it } from "vitest";
import { mapRows, parseCsv, safeCell, validateRows } from "@/lib/import/dealer-import";

const HEADER = "Mã đại lý,Tên đại lý,Họ tên người dùng,Email đăng nhập,Số điện thoại,Khu vực,Mật khẩu tạm";

describe("parseCsv", () => {
  it("đọc BOM, dấu ngoặc kép và dấu phẩy trong ô", () => {
    const rows = parseCsv(`﻿${HEADER}\r\nHCM001,"Đại lý ""ABC"", Q1",Nguyễn Văn A,a@x.vn,,HCM,\r\n`);
    expect(rows).toHaveLength(2);
    expect(rows[1][1]).toBe('Đại lý "ABC", Q1');
  });

  it("nhận dấu chấm phẩy làm phân cách", () => {
    const rows = parseCsv("Mã đại lý;Tên đại lý\nA1;B");
    expect(rows[1]).toEqual(["A1", "B"]);
  });
});

describe("mapRows", () => {
  it("map cột theo tên tiêu đề không phân biệt dấu và hoa thường", () => {
    const { rows, missing } = mapRows([
      ["ma dai ly", "TEN DAI LY", "Họ tên người dùng", "Email đăng nhập"],
      ["hcm001", "ABC", "Nguyễn A", "A@X.VN"],
    ]);
    expect(missing).toEqual([]);
    expect(rows[0]).toMatchObject({ rowNumber: 2, data: { code: "HCM001", email: "a@x.vn", region: "" } });
  });

  it("báo thiếu cột bắt buộc", () => {
    expect(mapRows([["Mã đại lý"]]).missing).toContain("Email đăng nhập");
  });
});

describe("validateRows", () => {
  const table = parseCsv(
    [
      HEADER,
      "HCM001,ABC,Nguyễn A,a@x.vn,0909,HCM,",
      "HCM001,DEF,Trần B,b@x.vn,,HN,",
      "HCM002,GHI,Lê C,a@x.vn,,,",
      ",JKL,Phạm D,not-an-email,abc,,",
      "HCM003,MNO,Võ E,exist@x.vn,,,short",
      "OLD01,PQR,Đỗ F,f@x.vn,,,",
    ].join("\n")
  );
  const { rows } = mapRows(table);
  const result = validateRows(rows, { codes: new Set(["OLD01"]), emails: new Set(["exist@x.vn"]) });
  const codes = (n: number) => result.find((r) => r.rowNumber === n)!.errors.map((e) => e.code);

  it("dòng hợp lệ không có lỗi", () => expect(codes(2)).toEqual([]));
  it("trùng mã trong file", () => expect(codes(3)).toContain("DUPLICATE_IN_FILE"));
  it("trùng email trong file", () => expect(codes(4)).toContain("DUPLICATE_IN_FILE"));
  it("thiếu mã, email sai, số điện thoại sai", () => {
    expect(codes(5)).toEqual(expect.arrayContaining(["REQUIRED", "INVALID_FORMAT"]));
    expect(result.find((r) => r.rowNumber === 5)!.errors).toHaveLength(3);
  });
  it("email đã tồn tại và mật khẩu tạm yếu", () => {
    expect(codes(6)).toEqual(expect.arrayContaining(["ALREADY_EXISTS", "INVALID_FORMAT"]));
  });
  it("mã đã tồn tại", () => expect(codes(7)).toContain("ALREADY_EXISTS"));
});

describe("safeCell", () => {
  it("chặn công thức khi export", () => {
    expect(safeCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeCell("-5")).toBe("'-5");
    expect(safeCell("Bình thường")).toBe("Bình thường");
    expect(safeCell(5)).toBe(5);
  });
});
