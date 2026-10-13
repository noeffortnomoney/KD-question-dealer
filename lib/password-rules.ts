export const DEFAULT_PASSWORD = "123456";
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 100;

export function passwordProblem(plain: string): string | null {
  if (plain.length < PASSWORD_MIN_LENGTH) return `Mật khẩu tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`;
  if (plain.length > PASSWORD_MAX_LENGTH) return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`;
  return null;
}
