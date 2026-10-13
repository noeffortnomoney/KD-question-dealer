import { requireUser } from "@/lib/auth-guard";
import { auth } from "@/lib/auth";
import { apiError, guardResponse } from "@/lib/http";
import { isGuid } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const guard = await requireUser();
  if ("error" in guard) return guardResponse(guard);
  const { materialId } = await params;
  if (!isGuid(materialId)) return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");

  const material = await prisma.sessionMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      kind: true,
      storageKey: true,
      fileName: true,
      contentType: true,
      session: { select: { id: true, status: true } },
    },
  });
  if (!material || material.kind !== "file" || !material.storageKey) {
    return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");
  }

  if (guard.role === "dealer") {
    const session = await auth();
    const dealerId = session?.user?.dealerId;
    if (!dealerId || material.session.status === "cancelled") {
      return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");
    }
    const assigned = await prisma.sessionAssignment.findUnique({
      where: { sessionId_dealerId: { sessionId: material.session.id, dealerId } },
      select: { id: true },
    });
    if (!assigned) return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");
  }

  const data = await readFile(material.storageKey);
  if (!data) return apiError(404, "NOT_FOUND", "Không tìm thấy tệp");
  const name = material.fileName ?? material.storageKey;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": material.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
