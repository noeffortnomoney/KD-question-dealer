import { describe, expect, it } from "vitest";
import { examPhase } from "./exam-status";

const at = (s: string) => new Date(s);
const exam = { status: "published", startsAt: at("2026-10-12T09:05:00Z"), endsAt: at("2026-10-12T09:30:00Z") };

describe("examPhase", () => {
  it("kỳ thi đã xuất bản tính theo giờ thực", () => {
    expect(examPhase(exam, at("2026-10-12T09:00:00Z"))).toBe("upcoming");
    expect(examPhase(exam, at("2026-10-12T09:05:00Z"))).toBe("open");
    expect(examPhase(exam, at("2026-10-12T09:29:59Z"))).toBe("open");
    expect(examPhase(exam, at("2026-10-12T09:30:00Z"))).toBe("ended");
    expect(examPhase(exam, at("2026-10-13T08:53:00Z"))).toBe("ended");
  });

  it("không giới hạn giờ thì luôn đang mở", () => {
    expect(examPhase({ status: "published", startsAt: null, endsAt: null }, at("2030-01-01T00:00:00Z"))).toBe("open");
  });

  it("bản nháp / đã đóng / lưu trữ giữ nguyên dù đang trong khung giờ", () => {
    const now = at("2026-10-12T09:10:00Z");
    expect(examPhase({ ...exam, status: "draft" }, now)).toBe("draft");
    expect(examPhase({ ...exam, status: "closed" }, now)).toBe("closed");
    expect(examPhase({ ...exam, status: "archived" }, now)).toBe("archived");
  });
});
