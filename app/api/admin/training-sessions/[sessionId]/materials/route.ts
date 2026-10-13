import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { writeAudit } from "@/lib/audit";
import { apiError, guardResponse } from "@/lib/http";
import { isGuid } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  mp4: "video/mp4",
};

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const guard = await requireAdmin();
  if ("error" in guard) return guardResponse(guard);
  const { sessionId } = await params;
  if (!isGuid(sessionId)) return apiError(404, "NOT_FOUND", "Không tìm thấy buổi training");

  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) return apiError(404, "NOT_FOUND", "Không tìm thấy buổi training");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(422, "VALIDATION_FAILED", "Không đọc được dữ liệu tải lên");
  }
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  if (!(file instanceof File)) return apiError(422, "VALIDATION_FAILED", "Chưa chọn file");
  if (!title || title.length > 250) return apiError(422, "VALIDATION_FAILED", "Tiêu đề bắt buộc, tối đa 250 ký tự");
  if (file.size > MAX_BYTES) return apiError(413, "PAYLOAD_TOO_LARGE", "File vượt quá 25 MB");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentType = ALLOWED[ext];
  if (!contentType) return apiError(415, "UNSUPPORTED_FILE", "Định dạng không được hỗ trợ");

  const storageKey = await saveFile(Buffer.from(await file.arrayBuffer()), ext);
  const last = await prisma.sessionMaterial.findFirst({
    where: { sessionId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const material = await prisma.sessionMaterial.create({
    data: {
      sessionId,
      title,
      kind: "file",
      storageKey,
      fileName: file.name.slice(0, 260),
      contentType,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });
  await writeAudit({
    actorUserId: guard.userId,
    action: "Session.MaterialUpload",
    entityType: "TrainingSession",
    entityId: sessionId,
    details: { materialId: material.id, title, fileName: file.name },
  });
  revalidatePath(`/admin/training-sessions/${sessionId}`);
  return NextResponse.json({ materialId: material.id }, { status: 201 });
}
