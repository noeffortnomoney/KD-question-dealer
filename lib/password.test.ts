import { describe, expect, it } from "vitest";
import { DEFAULT_PASSWORD, passwordProblem } from "@/lib/password-rules";

describe("passwordProblem", () => {
  it("mật khẩu mặc định hợp lệ", () => expect(passwordProblem(DEFAULT_PASSWORD)).toBeNull());
  it("chỉ cần đủ 6 ký tự, không bắt buộc chữ hay số", () => {
    expect(passwordProblem("654321")).toBeNull();
    expect(passwordProblem("abcdef")).toBeNull();
  });
  it("dưới 6 ký tự bị từ chối", () => expect(passwordProblem("12345")).toBe("Mật khẩu tối thiểu 6 ký tự"));
  it("quá 100 ký tự bị từ chối", () => expect(passwordProblem("a".repeat(101))).toBe("Mật khẩu tối đa 100 ký tự"));
});
