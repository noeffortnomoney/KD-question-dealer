"use client";

import { useState } from "react";

const SEGMENTS = [
  { key: "passed", label: "Đạt", color: "#0ca30c" },
  { key: "inProgress", label: "Đang làm", color: "#fab219" },
  { key: "failed", label: "Không đạt", color: "#d03b3b" },
  { key: "notStarted", label: "Chưa thi", color: "#c3c2b7" },
] as const;

type Key = (typeof SEGMENTS)[number]["key"];

export function ParticipationBar({ data }: { data: Record<Key, number> }) {
  const [hover, setHover] = useState<Key | null>(null);
  const total = SEGMENTS.reduce((s, x) => s + data[x.key], 0);
  const finished = data.passed + data.failed;
  const passRate = finished ? Math.round((data.passed / finished) * 1000) / 10 : 0;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tracking-tight">{passRate.toLocaleString("vi-VN")}%</span>
        <span className="text-sm text-[#52514e]">tỷ lệ đạt trên {finished} bài đã nộp</span>
      </div>
      <div className="relative mt-4" role="img" aria-label={`Tình trạng tham gia trên ${total} đại lý được giao`}>
        <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded bg-[#fcfcfb]">
          {SEGMENTS.filter((s) => data[s.key] > 0).map((s) => (
            <div
              key={s.key}
              className="h-full first:rounded-l last:rounded-r transition-opacity"
              style={{ width: `${pct(data[s.key])}%`, background: s.color, opacity: hover && hover !== s.key ? 0.35 : 1 }}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </div>
        {hover && (
          <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-md border bg-card px-3 py-1.5 text-xs shadow">
            <b>{SEGMENTS.find((s) => s.key === hover)!.label}</b>: {data[hover]} đại lý ({pct(data[hover]).toFixed(1)}%)
          </div>
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {SEGMENTS.map((s) => (
          <li
            key={s.key}
            className="flex items-center gap-2"
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-[#52514e]">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-[#0b0b0b]">{data[s.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
