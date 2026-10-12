import type { Label } from "@/lib/labels";

export const MEET_JOIN_EARLY_MINUTES = 15;

export type SessionPhase = "upcoming" | "live" | "ended" | "cancelled";

export interface SessionTiming {
  status: string;
  startsAt: Date;
  endsAt: Date;
}

export function sessionPhase(s: SessionTiming, now = new Date()): SessionPhase {
  if (s.status === "cancelled") return "cancelled";
  if (s.status === "completed" || now > s.endsAt) return "ended";
  if (now >= s.startsAt) return "live";
  return "upcoming";
}

export function canJoinSession(s: SessionTiming, now = new Date()): boolean {
  if (s.status !== "scheduled") return false;
  const opensAt = s.startsAt.getTime() - MEET_JOIN_EARLY_MINUTES * 60_000;
  return now.getTime() >= opensAt && now.getTime() <= s.endsAt.getTime();
}

export const SESSION_PHASE_LABEL: Record<SessionPhase, Label> = {
  upcoming: { text: "Sắp diễn ra", tone: "brand" },
  live: { text: "Đang diễn ra", tone: "success" },
  ended: { text: "Đã diễn ra", tone: "muted" },
  cancelled: { text: "Đã hủy", tone: "danger" },
};
