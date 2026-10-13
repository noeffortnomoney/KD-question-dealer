import bcrypt from "bcryptjs";

export { DEFAULT_PASSWORD, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordProblem } from "./password-rules";

const BCRYPT_COST = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
