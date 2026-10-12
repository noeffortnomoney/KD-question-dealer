import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

const BCRYPT_COST = 10;
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";

export function generateTempPassword(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += LETTERS[randomInt(LETTERS.length)];
  for (let i = 0; i < 3; i++) out += DIGITS[randomInt(DIGITS.length)];
  return `Kd${out}`;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function passwordProblem(plain: string): string | null {
  if (plain.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (plain.length > 100) return "Mật khẩu tối đa 100 ký tự";
  if (!/[A-Za-z]/.test(plain) || !/\d/.test(plain)) return "Mật khẩu phải có cả chữ và số";
  return null;
}
