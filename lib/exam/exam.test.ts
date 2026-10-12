import { describe, expect, it } from "vitest";
import { gradeAttempt, isPassed } from "@/lib/exam/grading";
import {
  computeDeadline,
  dealerExamState,
  isExamOpen,
  isOverdue,
  slotKeyFor,
  visibility,
  voidedSlotKey,
} from "@/lib/exam/policy";
import { pickQuestions, shuffle } from "@/lib/exam/select";
import { buildSnapshot, toExamQuestionDto } from "@/lib/exam/snapshot";
import type { QuestionSnapshot } from "@/lib/exam/types";

function snap(id: string, correct: string): QuestionSnapshot {
  return {
    questionId: id,
    questionVersion: 1,
    stem: `Q ${id}`,
    options: [
      { id: `${id}-a`, text: "A" },
      { id: `${id}-b`, text: "B" },
    ],
    correctOptionId: correct,
    explanation: "why",
  };
}

const at = (iso: string) => new Date(iso);

describe("gradeAttempt", () => {
  const questions = Array.from({ length: 30 }, (_, i) => ({
    attemptQuestionId: `AQ${i}`,
    points: 1,
    snapshot: snap(`q${i}`, `q${i}-a`),
  }));

  it("chấm 26/30 thành 86.67%", () => {
    const answers = questions.map((q, i) => ({
      attemptQuestionId: q.attemptQuestionId.toLowerCase(),
      selectedOptionId: i < 26 ? `Q${i}-A` : `q${i}-b`,
    }));
    const r = gradeAttempt(questions, answers);
    expect(r.correctCount).toBe(26);
    expect(r.scorePercent).toBe(86.67);
    expect(isPassed(r.scorePercent, 70)).toBe(true);
  });

  it("câu bỏ trống tính 0 điểm, không trừ điểm câu sai", () => {
    const r = gradeAttempt(questions, [{ attemptQuestionId: "AQ0", selectedOptionId: null }]);
    expect(r.correctCount).toBe(0);
    expect(r.scorePercent).toBe(0);
  });

  it("đạt khi đúng bằng điểm đạt", () => {
    expect(isPassed(70, 70)).toBe(true);
    expect(isPassed(69.99, 70)).toBe(false);
  });
});

describe("deadline & overdue", () => {
  it("deadline = bắt đầu + thời lượng", () => {
    expect(computeDeadline(at("2026-10-12T02:00:00Z"), 45, null).toISOString()).toBe("2026-10-12T02:45:00.000Z");
  });

  it("deadline bị cắt theo giờ đóng kỳ thi", () => {
    const d = computeDeadline(at("2026-10-12T02:30:00Z"), 45, at("2026-10-12T03:00:00Z"));
    expect(d.toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });

  it("chỉ quá hạn sau grace", () => {
    const deadline = at("2026-10-12T02:45:00Z");
    expect(isOverdue(deadline, at("2026-10-12T02:45:05Z"), 10_000)).toBe(false);
    expect(isOverdue(deadline, at("2026-10-12T02:45:11Z"), 10_000)).toBe(true);
  });
});

describe("exam open & visibility", () => {
  const exam = { status: "published", startsAt: at("2026-10-12T00:00:00Z"), endsAt: at("2026-10-20T00:00:00Z") };

  it("mở trong khoảng thời gian", () => {
    expect(isExamOpen(exam, at("2026-10-15T00:00:00Z"))).toBe(true);
    expect(isExamOpen(exam, at("2026-10-11T23:59:59Z"))).toBe(false);
    expect(isExamOpen(exam, at("2026-10-20T00:00:00Z"))).toBe(false);
    expect(isExamOpen({ ...exam, status: "draft" }, at("2026-10-15T00:00:00Z"))).toBe(false);
  });

  it("đáp án chỉ hiện sau khi kỳ thi kết thúc", () => {
    expect(visibility("after_exam_ends", exam, at("2026-10-15T00:00:00Z")).visible).toBe(false);
    expect(visibility("after_exam_ends", exam, at("2026-10-21T00:00:00Z")).visible).toBe(true);
    expect(visibility("after_exam_ends", { ...exam, status: "closed" }, at("2026-10-15T00:00:00Z")).visible).toBe(true);
    expect(visibility("after_submit", exam, at("2026-10-15T00:00:00Z")).visible).toBe(true);
    expect(visibility("never", exam, at("2026-10-21T00:00:00Z")).visible).toBe(false);
  });
});

describe("dealerExamState", () => {
  const exam = { status: "published", startsAt: at("2026-10-12T00:00:00Z"), endsAt: at("2026-10-20T00:00:00Z") };
  const now = at("2026-10-15T00:00:00Z");

  it("các trạng thái nút kỳ thi", () => {
    expect(dealerExamState(exam, null, false, now)).toBe("can_start");
    expect(dealerExamState(exam, null, true, now)).toBe("reissued");
    expect(dealerExamState(exam, null, false, at("2026-10-11T00:00:00Z"))).toBe("not_open");
    expect(dealerExamState(exam, null, false, at("2026-10-21T00:00:00Z"))).toBe("closed");
    expect(
      dealerExamState(exam, { status: "InProgress", deadlineAt: at("2026-10-15T00:30:00Z") }, false, now)
    ).toBe("in_progress");
    expect(
      dealerExamState(exam, { status: "InProgress", deadlineAt: at("2026-10-14T00:30:00Z") }, false, now)
    ).toBe("finished");
    expect(dealerExamState(exam, { status: "Submitted", deadlineAt: now }, false, now)).toBe("finished");
  });
});

describe("slot key", () => {
  it("một khóa cho mỗi cặp kỳ thi - đại lý, khóa hủy khác khóa gốc", () => {
    const key = slotKeyFor("EXAM-1", "DEALER-1");
    expect(key).toBe("exam-1:dealer-1");
    expect(voidedSlotKey(key, "ATT-1")).toBe("exam-1:dealer-1:void:att-1");
    expect(voidedSlotKey(key, "ATT-1")).not.toBe(key);
  });
});

describe("pickQuestions & shuffle", () => {
  const pool = Array.from({ length: 40 }, (_, i) => i);

  it("fixed lấy đúng N câu đầu", () => {
    expect(pickQuestions(pool, 30, "fixed")).toEqual(pool.slice(0, 30));
  });

  it("random lấy đúng N câu khác nhau", () => {
    const picked = pickQuestions(pool, 30, "random");
    expect(picked).toHaveLength(30);
    expect(new Set(picked).size).toBe(30);
  });

  it("không đủ câu thì trả rỗng", () => {
    expect(pickQuestions(pool.slice(0, 29), 30, "random")).toEqual([]);
  });

  it("shuffle giữ nguyên phần tử", () => {
    expect(shuffle(pool).slice().sort((a, b) => a - b)).toEqual(pool);
  });
});

describe("snapshot", () => {
  const question = {
    id: "q1",
    version: 3,
    stem: "Stem",
    explanation: "Giải thích",
    options: [
      { id: "o2", text: "B", isCorrect: false, sortOrder: 2 },
      { id: "o1", text: "A", isCorrect: true, sortOrder: 1 },
    ],
  };

  it("giữ đáp án đúng trong snapshot", () => {
    const s = buildSnapshot(question, false);
    expect(s.options.map((o) => o.id)).toEqual(["o1", "o2"]);
    expect(s.correctOptionId).toBe("o1");
    expect(s.questionVersion).toBe(3);
  });

  it("DTO gửi cho thí sinh không chứa đáp án và giải thích", () => {
    const dto = toExamQuestionDto({
      attemptQuestionId: "aq1",
      order: 1,
      snapshot: buildSnapshot(question, true),
      selectedOptionId: null,
      version: 0,
    });
    const json = JSON.stringify(dto);
    expect(json).not.toMatch(/isCorrect|correctOptionId|explanation|Giải thích/);
    expect(dto.options).toHaveLength(2);
  });

  it("báo lỗi khi câu hỏi không có đáp án đúng", () => {
    expect(() =>
      buildSnapshot({ ...question, options: question.options.map((o) => ({ ...o, isCorrect: false })) }, false)
    ).toThrow();
  });
});
