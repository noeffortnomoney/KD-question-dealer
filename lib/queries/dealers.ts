import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface DealerFilters {
  q?: string;
  region?: string;
  status?: string;
}

export function dealerWhere(filters: DealerFilters): Prisma.DealerWhereInput {
  const q = filters.q?.trim();
  return {
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.status === "active" || filters.status === "locked" ? { status: filters.status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q } },
            { name: { contains: q } },
            { users: { some: { email: { contains: q } } } },
          ],
        }
      : {}),
  };
}

export async function listRegions(): Promise<string[]> {
  const rows = await prisma.dealer.findMany({
    where: { region: { not: null } },
    distinct: ["region"],
    select: { region: true },
    orderBy: { region: "asc" },
  });
  return rows.map((r) => r.region).filter((r): r is string => Boolean(r));
}
