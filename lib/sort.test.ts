import { describe, expect, it } from "vitest";
import { parseSort, sortRows } from "./sort";

describe("parseSort", () => {
  const keys = ["code", "name"] as const;
  const fallback = { key: "code" as const, dir: "asc" as const };

  it("dùng mặc định khi không có hoặc sai cột", () => {
    expect(parseSort({}, keys, fallback)).toEqual(fallback);
    expect(parseSort({ sort: "passwordHash", dir: "desc" }, keys, fallback)).toEqual(fallback);
  });

  it("đọc cột và chiều hợp lệ, chiều lạ coi là tăng dần", () => {
    expect(parseSort({ sort: "name", dir: "desc" }, keys, fallback)).toEqual({ key: "name", dir: "desc" });
    expect(parseSort({ sort: ["name"], dir: "xyz" }, keys, fallback)).toEqual({ key: "name", dir: "asc" });
  });
});

describe("sortRows", () => {
  it("so sánh tiếng Việt và số trong chuỗi tự nhiên", () => {
    const rows = ["Đà Nẵng", "An Giang", "Bình Dương", "đại lý 10", "đại lý 2"];
    expect(sortRows(rows, (r) => r, "asc")).toEqual(["An Giang", "Bình Dương", "Đà Nẵng", "đại lý 2", "đại lý 10"]);
  });

  it("giá trị trống luôn nằm cuối ở cả 2 chiều", () => {
    const rows = [{ v: 5 }, { v: null }, { v: 9 }, { v: undefined }, { v: 1 }];
    expect(sortRows(rows, (r) => r.v, "asc").map((r) => r.v)).toEqual([1, 5, 9, null, undefined]);
    expect(sortRows(rows, (r) => r.v, "desc").map((r) => r.v)).toEqual([9, 5, 1, null, undefined]);
  });

  it("ngày và boolean, giữ thứ tự gốc khi bằng nhau", () => {
    const d = (s: string) => new Date(s);
    const rows = [
      { id: "a", at: d("2026-10-02"), ok: true },
      { id: "b", at: d("2026-10-01"), ok: false },
      { id: "c", at: d("2026-10-02"), ok: true },
    ];
    expect(sortRows(rows, (r) => r.at, "desc").map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(sortRows(rows, (r) => r.ok, "asc").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
});
