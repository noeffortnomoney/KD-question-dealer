"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { joinSessionAction } from "@/lib/actions/learning";

export function JoinMeetButton({
  sessionId,
  joinUrl,
  past,
  size = "sm",
}: {
  sessionId: string;
  joinUrl: string | null;
  past: boolean;
  size?: "sm" | "default";
}) {
  const router = useRouter();

  if (past) {
    return (
      <Button size={size} variant="outline" disabled>
        Đã diễn ra
      </Button>
    );
  }
  if (!joinUrl) {
    return (
      <Button size={size} variant="outline" disabled className="text-brand" title="Nút mở trước giờ bắt đầu 15 phút">
        Chưa đến giờ
      </Button>
    );
  }

  const recordAttendance = () => {
    void joinSessionAction(sessionId).then(() => router.refresh());
  };

  return (
    <Button asChild size={size}>
      <a href={joinUrl} target="_blank" rel="noopener noreferrer" onClick={recordAttendance} onAuxClick={recordAttendance}>
        Tham gia <ExternalLink className="size-3.5" />
      </a>
    </Button>
  );
}
