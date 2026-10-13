import { Clock, ExternalLink, FileText, Link2, User, Video } from "lucide-react";
import { JoinMeetButton } from "@/components/learning/JoinMeetButton";
import { SessionDateBadge } from "@/components/learning/SessionDateBadge";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { formatTime } from "@/lib/date-utils";
import type { SessionMaterialLink } from "@/lib/queries/learning";
import { SESSION_PHASE_LABEL, type SessionPhase } from "@/lib/session-status";

export function SessionRow({
  session,
  showDetails = false,
}: {
  session: {
    id: string;
    title: string;
    description?: string | null;
    presenterName: string | null;
    startsAt: Date;
    endsAt: Date;
    joinUrl: string | null;
    phase: SessionPhase;
    joined: boolean;
    past: boolean;
    materials?: SessionMaterialLink[];
  };
  showDetails?: boolean;
}) {
  const materials = session.materials ?? [];
  return (
    <div className="rounded-xl border bg-card p-4" data-testid="session-row">
      <div className="flex items-center gap-4">
        <SessionDateBadge date={session.startsAt} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{session.title}</p>
            {session.phase === "live" && <StatusBadge map={SESSION_PHASE_LABEL} value="live" />}
            {session.joined && <ToneBadge tone="success">Đã tham gia</ToneBadge>}
          </div>
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
            {!showDetails && materials.length > 0 && (
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-brand" /> {materials.length} tài liệu
              </span>
            )}
          </div>
        </div>
        <JoinMeetButton sessionId={session.id} joinUrl={session.joinUrl} past={session.past} />
      </div>
      {showDetails && (session.description || materials.length > 0) && (
        <div className="mt-3 space-y-2 border-t pt-3 sm:pl-18">
          {session.description && <p className="whitespace-pre-line text-sm text-muted-foreground">{session.description}</p>}
          {materials.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tài liệu buổi training">
              {materials.map((m) => {
                const Icon = m.kind === "file" ? FileText : Link2;
                return (
                  <li key={m.id}>
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
                    >
                      <Icon className="size-3.5 text-brand" />
                      {m.title}
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
