import { describe, expect, it } from "vitest";
import { canJoinSession, sessionPhase } from "@/lib/session-status";

const s = {
  status: "scheduled",
  startsAt: new Date("2026-10-12T07:15:00Z"),
  endsAt: new Date("2026-10-12T11:00:00Z"),
};
const at = (iso: string) => new Date(iso);

describe("sessionPhase", () => {
  it("theo giờ thực", () => {
    expect(sessionPhase(s, at("2026-10-12T07:00:00Z"))).toBe("upcoming");
    expect(sessionPhase(s, at("2026-10-12T07:40:00Z"))).toBe("live");
    expect(sessionPhase(s, at("2026-10-12T11:00:01Z"))).toBe("ended");
    expect(sessionPhase({ ...s, status: "cancelled" }, at("2026-10-12T07:40:00Z"))).toBe("cancelled");
    expect(sessionPhase({ ...s, status: "completed" }, at("2026-10-12T07:40:00Z"))).toBe("ended");
  });
});

describe("canJoinSession", () => {
  it("mở trước 15 phút, đóng khi kết thúc", () => {
    expect(canJoinSession(s, at("2026-10-12T06:59:00Z"))).toBe(false);
    expect(canJoinSession(s, at("2026-10-12T07:00:00Z"))).toBe(true);
    expect(canJoinSession(s, at("2026-10-12T07:40:00Z"))).toBe(true);
    expect(canJoinSession(s, at("2026-10-12T11:00:01Z"))).toBe(false);
    expect(canJoinSession({ ...s, status: "cancelled" }, at("2026-10-12T07:40:00Z"))).toBe(false);
  });
});
