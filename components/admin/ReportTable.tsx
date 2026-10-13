"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import { AttemptDrawer } from "@/components/admin/AttemptDrawer";
import { SttCell, SttHead } from "@/components/common/RowNumber";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { ActionIcon, ActionsCell, ActionsHead, EmptyValue, SortableHead } from "@/components/common/TableParts";
import type { SortState } from "@/lib/sort";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
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

export function ReportTable({ rows, offset = 0, sort }: { rows: ReportRowView[]; offset?: number; sort: SortState }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <SttHead />
            <SortableHead column="code" sort={sort}>Mã</SortableHead>
            <SortableHead column="name" sort={sort}>Đại lý</SortableHead>
            <SortableHead column="region" sort={sort}>Khu vực</SortableHead>
            <SortableHead column="status" sort={sort}>Trạng thái</SortableHead>
            <SortableHead column="startedAt" sort={sort} firstDir="desc">Bắt đầu</SortableHead>
            <SortableHead column="duration" sort={sort}>Thời gian làm</SortableHead>
            <SortableHead column="score" sort={sort} firstDir="desc" align="right">Điểm</SortableHead>
            <SortableHead column="result" sort={sort} firstDir="desc">Kết quả</SortableHead>
            <ActionsHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow
              key={r.dealerId}
              onClick={() => r.attemptId && setOpen(r.attemptId)}
              className={cn(r.attemptId && "cursor-pointer")}
              data-testid={`report-row-${r.dealerCode}`}
            >
              <SttCell n={offset + i + 1} />
              <TableCell className="font-mono text-xs">{r.dealerCode}</TableCell>
              <TableCell className="font-medium">{r.dealerName}</TableCell>
              <TableCell>{r.region ?? <EmptyValue>Chưa phân vùng</EmptyValue>}</TableCell>
              <TableCell>
                <StatusBadge map={ATTEMPT_STATUS_LABEL} value={r.status} />
                {r.voidedCount > 0 && <span className="ml-1 text-xs text-muted-foreground">({r.voidedCount} lượt đã hủy)</span>}
              </TableCell>
              <TableCell className="tabular-nums">{r.startedAt ? formatDateTime(r.startedAt) : <EmptyValue>Chưa thi</EmptyValue>}</TableCell>
              <TableCell className="tabular-nums">{r.durationSeconds !== null ? formatDuration(r.durationSeconds) : <EmptyValue>—</EmptyValue>}</TableCell>
              <TableCell className="text-right tabular-nums">
                {r.scorePercent !== null ? (
                  <>
                    <b>{formatScore(r.scorePercent)}</b>
                    <span className="text-xs text-muted-foreground"> ({r.correctCount}/{r.totalQuestions})</span>
                  </>
                ) : (
                  <EmptyValue>—</EmptyValue>
                )}
              </TableCell>
              <TableCell>
                {r.isPassed === null ? (
                  <EmptyValue>—</EmptyValue>
                ) : (
                  <ToneBadge tone={r.isPassed ? "success" : "danger"}>{r.isPassed ? "Đạt" : "Không đạt"}</ToneBadge>
                )}
              </TableCell>
              <ActionsCell>
                {r.attemptId && (
                  <ActionIcon label="Xem bài làm" tone="edit" onClick={() => setOpen(r.attemptId)}>
                    <Eye className="size-4" />
                  </ActionIcon>
                )}
              </ActionsCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AttemptDrawer attemptId={open} onClose={() => setOpen(null)} />
    </>
  );
}
