import { describe, expect, it } from "vitest";
import { clampPage, pageWindow, paginate, parsePage, parsePageSize } from "@/lib/pagination";

describe("pagination", () => {
  it("cỡ trang chỉ nhận 10/20/50/100, mặc định 10", () => {
    expect(parsePageSize(undefined)).toBe(10);
    expect(parsePageSize("50")).toBe(50);
    expect(parsePageSize("7")).toBe(10);
    expect(parsePageSize(["100"])).toBe(100);
  });

  it("trang không hợp lệ về 1, trang vượt quá thì về trang cuối", () => {
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(clampPage(9, 45, 10)).toBe(5);
    expect(clampPage(3, 0, 10)).toBe(1);
  });

  it("cắt đúng dữ liệu theo trang", () => {
    const items = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(paginate(items, 1, 10).items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(paginate(items, 5, 10).items).toEqual([41, 42, 43, 44, 45]);
    expect(paginate(items, 99, 20)).toMatchObject({ page: 3, offset: 40 });
  });

  it("dãy số trang có dấu …", () => {
    expect(pageWindow(1, 4)).toEqual([1, 2, 3, 4]);
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 5, 6, "…", 20]);
    expect(pageWindow(10, 20)).toEqual([1, "…", 8, 9, 10, 11, 12, "…", 20]);
    expect(pageWindow(20, 20)).toEqual([1, "…", 15, 16, 17, 18, 19, 20]);
  });
});
