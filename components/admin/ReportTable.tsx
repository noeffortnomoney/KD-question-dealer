"use client";

import { useState } from "react";
import { AttemptDrawer } from "@/components/admin/AttemptDrawer";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatDuration } from "@/lib/date-utils";
import { formatScore } from "@/lib/format";
import { ATTEMPT_STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface ReportRowView {
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  region: string | null;
  attemptId: string | null;
  attemptNo: number | null;
  status: string;
  startedAt: string | null;
  durationSeconds: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  scorePercent: number | null;
  isPassed: boolean | null;
  voidedCount: number;
}

export function ReportTable({ rows }: { rows: ReportRowView[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mã</TableHead>
            <TableHead>Đại lý</TableHead>
            <TableHead>Khu vực</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Bắt đầu</TableHead>
            <TableHead>Thời gian làm</TableHead>
            <TableHead className="text-right">Điểm</TableHead>
            <TableHead className="text-right">Kết quả</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.dealerId}
              onClick={() => r.attemptId && setOpen(r.attemptId)}
              className={cn(r.attemptId && "cursor-pointer")}
              data-testid={`report-row-${r.dealerCode}`}
            >
              <TableCell className="font-mono text-xs">{r.dealerCode}</TableCell>
              <TableCell className="font-medium">{r.dealerName}</TableCell>
              <TableCell>{r.region ?? "—"}</TableCell>
              <TableCell>
                <StatusBadge map={ATTEMPT_STATUS_LABEL} value={r.status} />
                {r.voidedCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({r.voidedCount} lượt đã hủy)</span>}
              </TableCell>
              <TableCell className="text-xs">{formatDateTime(r.startedAt)}</TableCell>
              <TableCell className="text-xs">{r.durationSeconds !== null ? formatDuration(r.durationSeconds) : "—"}</TableCell>
              <TableCell className="text-right">
                {r.scorePercent !== null ? (
                  <>
                    <b>{formatScore(r.scorePercent)}</b>
                    <span className="text-xs text-muted-foreground"> ({r.correctCount}/{r.totalQuestions})</span>
                  </>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                {r.isPassed === null ? "—" : <span className={r.isPassed ? "font-semibold text-success" : "font-semibold text-red-600"}>{r.isPassed ? "Đạt" : "Không đạt"}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AttemptDrawer attemptId={open} onClose={() => setOpen(null)} />
    </>
  );
}
