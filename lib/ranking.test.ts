import { describe, expect, it } from "vitest";
import { rankRows, topPercent, type RankInput } from "@/lib/ranking";

function row(code: string, score: number, duration: number, finishedMinute = 0): RankInput {
  return {
    attemptId: `a-${code}`,
    dealerId: `d-${code}`,
    code,
    name: code,
    region: null,
    scorePercent: score,
    correctCount: 0,
    totalQuestions: 30,
    durationSeconds: duration,
    finishedAt: new Date(Date.UTC(2026, 9, 12, 2, finishedMinute)),
    isPassed: score >= 70,
  };
}

describe("rankRows", () => {
  it("điểm cao hơn xếp trước", () => {
    const r = rankRows([row("A", 70, 100), row("B", 90, 100), row("C", 80, 100)]);
    expect(r.map((x) => [x.code, x.rank])).toEqual([
      ["B", 1],
      ["C", 2],
      ["A", 3],
    ]);
  });

  it("bằng điểm thì làm nhanh hơn xếp trước", () => {
    const r = rankRows([row("A", 90, 1800), row("B", 90, 1500)]);
    expect(r.map((x) => [x.code, x.rank])).toEqual([
      ["B", 1],
      ["A", 2],
    ]);
  });

  it("bằng điểm và bằng thời gian thì đồng hạng, hạng kế tiếp bị nhảy", () => {
    const r = rankRows([row("A", 90, 1500, 1), row("B", 90, 1500, 2), row("C", 80, 1000)]);
    expect(r.map((x) => [x.code, x.rank])).toEqual([
      ["A", 1],
      ["B", 1],
      ["C", 3],
    ]);
  });

  it("danh sách rỗng", () => {
    expect(rankRows([])).toEqual([]);
  });
});

describe("topPercent", () => {
  it("làm tròn và tối thiểu 1%", () => {
    expect(topPercent(1, 650)).toBe(1);
    expect(topPercent(12, 650)).toBe(2);
    expect(topPercent(3, 3)).toBe(100);
  });
});
