import { NextResponse } from "next/server";
import type { GuardError } from "@/lib/auth-guard";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "EXAM_NOT_OPEN"
  | "EXAM_NOT_ASSIGNED"
  | "EXAM_INSUFFICIENT_QUESTIONS"
  | "ATTEMPT_ALREADY_USED"
  | "ATTEMPT_CLOSED"
  | "ATTEMPT_IN_PROGRESS"
  | "INVALID_OPTION"
  | "RESULT_NOT_PUBLISHED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_FILE"
  | "CONFLICT";

export interface Failure {
  ok: false;
  status: number;
  code: ErrorCode;
  error: string;
}

export interface Success<T> {
  ok: true;
  status?: number;
  data: T;
}

export type Result<T> = Success<T> | Failure;

export function ok<T>(data: T, status?: number): Success<T> {
  return { ok: true, data, status };
}

export function fail(status: number, code: ErrorCode, error: string): Failure {
  return { ok: false, status, code, error };
}

export function apiError(status: number, code: ErrorCode, error: string) {
  return NextResponse.json({ error, code }, { status });
}

export function guardResponse(guard: GuardError) {
  return apiError(guard.status, guard.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN", guard.error);
}

export function toResponse<T>(result: Result<T>) {
  if (!result.ok) return apiError(result.status, result.code, result.error);
  return NextResponse.json(result.data, { status: result.status ?? 200 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
