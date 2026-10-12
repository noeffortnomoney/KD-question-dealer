import { prisma } from "@/lib/prisma";

const CHUNK = 1000;

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

export async function findExisting(codes: string[], emails: string[]) {
  const existingCodes = new Set<string>();
  const existingEmails = new Set<string>();
  for (const part of chunks([...new Set(codes.filter(Boolean))])) {
    const rows = await prisma.dealer.findMany({ where: { code: { in: part } }, select: { code: true } });
    rows.forEach((r) => existingCodes.add(r.code.toUpperCase()));
  }
  for (const part of chunks([...new Set(emails.filter(Boolean))])) {
    const rows = await prisma.user.findMany({ where: { email: { in: part } }, select: { email: true } });
    rows.forEach((r) => existingEmails.add(r.email.toLowerCase()));
  }
  return { codes: existingCodes, emails: existingEmails };
}
