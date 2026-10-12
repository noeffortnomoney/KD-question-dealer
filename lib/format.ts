const scoreFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
const percentFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export function formatScore(scorePercent: number | null | undefined): string {
  if (scorePercent === null || scorePercent === undefined) return "—";
  return scoreFmt.format(Math.round(scorePercent * 10) / 10);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${percentFmt.format(value)}%`;
}
