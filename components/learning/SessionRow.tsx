import { Clock, User, Video } from "lucide-react";
import { JoinMeetButton } from "@/components/learning/JoinMeetButton";
import { SessionDateBadge } from "@/components/learning/SessionDateBadge";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { formatTime } from "@/lib/date-utils";
import { SESSION_PHASE_LABEL, type SessionPhase } from "@/lib/session-status";

export function SessionRow({
  session,
}: {
  session: {
    id: string;
    title: string;
    presenterName: string | null;
    startsAt: Date;
    endsAt: Date;
    joinUrl: string | null;
    phase: SessionPhase;
    joined: boolean;
    past: boolean;
    course?: { title: string };
  };
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card p-4" data-testid="session-row">
      <SessionDateBadge date={session.startsAt} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{session.title}</p>
          {session.phase === "live" && <StatusBadge map={SESSION_PHASE_LABEL} value="live" />}
          {session.joined && <ToneBadge tone="success">Đã tham gia</ToneBadge>}
        </div>
        {session.course && <p className="text-xs text-muted-foreground">{session.course.title}</p>}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-brand" /> {formatTime(session.startsAt)} – {formatTime(session.endsAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Video className="size-3.5 text-brand" /> Google Meet
          </span>
          {session.presenterName && (
            <span className="flex items-center gap-1.5">
              <User className="size-3.5 text-brand" /> {session.presenterName}
            </span>
          )}
        </div>
      </div>
      <JoinMeetButton sessionId={session.id} joinUrl={session.joinUrl} past={session.past} />
    </div>
  );
}
