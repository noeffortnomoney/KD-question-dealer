import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/import/dealer-import";
import { mapQuestionRows, parseCorrect, parseDifficulty, validateQuestionRows } from "@/lib/import/question-import";

const HEADER = "Chủ đề,Nội dung câu hỏi,Đáp án A,Đáp án B,Đáp án C,Đáp án D,Đáp án E,Đáp án F,Đáp án đúng,Giải thích,Độ khó";

function run(lines: string[], existing: string[] = []) {
  const { rows, missing } = mapQuestionRows(parseCsv([HEADER, ...lines].join("\n")));
  expect(missing).toEqual([]);
  return validateQuestionRows(rows, {
    categories: new Map([["kien thuc san pham", { id: "cat-1", name: "Kiến thức sản phẩm" }]]),
    existingStems: new Set(existing),
  });
}

describe("parseCorrect / parseDifficulty", () => {
  it("nhận chữ cái, số, có dấu chấm", () => {
    expect(parseCorrect("a")).toBe(0);
    expect(parseCorrect(" C. ")).toBe(2);
    expect(parseCorrect("4")).toBe(3);
    expect(parseCorrect("G")).toBeNull();
  });
  it("độ khó tiếng Việt có/không dấu, mặc định trung bình", () => {
    expect(parseDifficulty("")).toBe(2);
    expect(parseDifficulty("Dễ")).toBe(1);
    expect(parseDifficulty("kho")).toBe(3);
    expect(parseDifficulty("Rất khó")).toBeNull();
  });
});

describe("validateQuestionRows", () => {
  it("dòng hợp lệ khớp chủ đề có sẵn không phân biệt dấu", () => {
    const [r] = run(["kien thuc SAN PHAM,Câu hỏi hợp lệ số 1,Một,Hai,Ba,,,,B,Vì sao,Khó"]);
    expect(r.errors).toEqual([]);
    expect(r.question).toMatchObject({ categoryId: "cat-1", categoryName: "Kiến thức sản phẩm", options: ["Một", "Hai", "Ba"], correctIndex: 1, difficulty: 3 });
  });

  it("chủ đề mới thì categoryId null", () => {
    const [r] = run(["Chủ đề mới,Câu hỏi chủ đề mới,X,Y,,,,,A,,"]);
    expect(r.question?.categoryId).toBeNull();
  });

  it("báo lỗi: đáp án đúng trỏ vào ô trống, thiếu đáp án B, lựa chọn bị nhảy cóc", () => {
    const rows = run([
      "Kiến thức sản phẩm,Câu đáp án đúng trống,Một,Hai,,,,,C,,",
      "Kiến thức sản phẩm,Câu thiếu B,Một,,,,,,A,,",
      "Kiến thức sản phẩm,Câu nhảy cóc,Một,Hai,,Bốn,,,A,,",
      "Kiến thức sản phẩm,Câu đáp án sai,Một,Hai,,,,,Z,,",
    ]);
    expect(rows[0].errors[0].message).toMatch(/ô Đáp án C trống/);
    expect(rows[1].errors[0].message).toMatch(/ít nhất 2 lựa chọn/);
    expect(rows[2].errors[0].message).toMatch(/Đáp án C bị trống/);
    expect(rows[3].errors[0].message).toMatch(/A–F/);
  });

  it("báo trùng trong file và trùng với dữ liệu đã có", () => {
    const rows = run(
      ["Kiến thức sản phẩm,Câu bị trùng,Một,Hai,,,,,A,,", "Kiến thức sản phẩm,câu  bị TRÙNG,Một,Hai,,,,,A,,", "Kiến thức sản phẩm,Câu đã có,Một,Hai,,,,,A,,"],
      ["kien thuc san pham|câu đã có"]
    );
    expect(rows[0].errors).toEqual([]);
    expect(rows[1].errors[0].message).toMatch(/Trùng với câu hỏi ở dòng 2/);
    expect(rows[2].errors[0].message).toMatch(/đã tồn tại/);
  });

  it("thiếu cột bắt buộc", () => {
    expect(mapQuestionRows([["Chủ đề", "Nội dung câu hỏi"]]).missing).toContain("Đáp án đúng");
  });
});
