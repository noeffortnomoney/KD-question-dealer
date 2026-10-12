"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  title: string;
  avgScore: number;
  passRate: number | null;
  finished: number;
}

function shorten(s: string) {
  return s.length > 18 ? `${s.slice(0, 17)}…` : s;
}

function TooltipBox({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow">
      <p className="font-semibold text-[#0b0b0b]">{p.title}</p>
      <p className="text-[#52514e]">
        Điểm TB: <b className="text-[#0b0b0b]">{p.avgScore.toLocaleString("vi-VN")}</b>/100
      </p>
      <p className="text-[#52514e]">
        Tỷ lệ đạt: <b className="text-[#0b0b0b]">{p.passRate?.toLocaleString("vi-VN") ?? "—"}%</b> · {p.finished} bài
      </p>
    </div>
  );
}

export function AvgScoreBars({ data }: { data: Point[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="#e1e0d9" />
          <XAxis
            dataKey="title"
            tickFormatter={shorten}
            tick={{ fontSize: 11, fill: "#898781" }}
            axisLine={{ stroke: "#c3c2b7" }}
            tickLine={false}
            interval={0}
          />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(11,11,11,0.04)" }} />
          <Bar dataKey="avgScore" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
