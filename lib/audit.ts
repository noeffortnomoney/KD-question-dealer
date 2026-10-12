import { prisma, type Tx } from "@/lib/prisma";

export interface AuditEntry {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
}

export async function writeAudit(entry: AuditEntry, tx?: Tx) {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      details: entry.details === undefined ? null : JSON.stringify(entry.details),
    },
  });
}
