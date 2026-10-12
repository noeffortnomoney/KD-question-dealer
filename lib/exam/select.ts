import { randomInt } from "crypto";

export function shuffle<T>(items: readonly T[], rand: (max: number) => number = randomInt): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickQuestions<T>(
  pool: readonly T[],
  count: number,
  mode: "fixed" | "random",
  rand: (max: number) => number = randomInt
): T[] {
  if (count <= 0 || pool.length < count) return [];
  if (mode === "fixed") return pool.slice(0, count);
  return shuffle(pool, rand).slice(0, count);
}
