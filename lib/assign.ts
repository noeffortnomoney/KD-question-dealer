import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const assignSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("all") }),
  z.object({ mode: z.literal("region"), region: z.string().trim().min(1, "Chọn khu vực") }),
  z.object({ mode: z.literal("codes"), codes: z.string().trim().min(1, "Nhập ít nhất một mã đại lý") }),
]);

export type AssignInput = z.infer<typeof assignSchema>;

export async function resolveDealers(input: AssignInput): Promise<{ ids: string[]; missing: string[] }> {
  if (input.mode === "all") {
    const rows = await prisma.dealer.findMany({ where: { status: "active" }, select: { id: true } });
    return { ids: rows.map((r) => r.id), missing: [] };
  }
  if (input.mode === "region") {
    const rows = await prisma.dealer.findMany({ where: { status: "active", region: input.region }, select: { id: true } });
    return { ids: rows.map((r) => r.id), missing: [] };
  }
  const codes = [...new Set(input.codes.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean))];
  const rows = await prisma.dealer.findMany({ where: { code: { in: codes.slice(0, 2000) } }, select: { id: true, code: true } });
  const found = new Set(rows.map((r) => r.code.toUpperCase()));
  return { ids: rows.map((r) => r.id), missing: codes.filter((c) => !found.has(c)) };
}
