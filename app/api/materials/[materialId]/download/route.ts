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

  const material = await prisma.courseMaterial.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      kind: true,
      storageKey: true,
      fileName: true,
      contentType: true,
      course: { select: { id: true, status: true } },
    },
  });
  if (!material || material.kind !== "file" || !material.storageKey) {
    return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");
  }

  if (guard.role === "dealer") {
    const session = await auth();
    const dealerId = session?.user?.dealerId;
    if (!dealerId || material.course.status !== "published") {
      return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");
    }
    const enrolled = await prisma.courseEnrollment.findUnique({
      where: { courseId_dealerId: { courseId: material.course.id, dealerId } },
      select: { id: true },
    });
    if (!enrolled) return apiError(404, "NOT_FOUND", "Không tìm thấy tài liệu");
    await prisma.materialProgress.upsert({
      where: { materialId_dealerId: { materialId: material.id, dealerId } },
      create: { materialId: material.id, dealerId },
      update: {},
    });
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
