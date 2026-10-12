import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/QuestionForm";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { setQuestionStatusAction } from "@/lib/actions/admin/questions";
import { isGuid } from "@/lib/ids";
import { CONTENT_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function QuestionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isGuid(id)) notFound();

  const [categories, question] = await Promise.all([
    prisma.questionCategory.findMany({
      where: { status: "active" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    isNew
      ? null
      : prisma.question.findUnique({
          where: { id },
          select: {
            id: true,
            categoryId: true,
            stem: true,
            explanation: true,
            difficulty: true,
            status: true,
            version: true,
            options: { orderBy: { sortOrder: "asc" }, select: { id: true, text: true, isCorrect: true } },
            examQuestions: { select: { exam: { select: { id: true, title: true, status: true } } } },
          },
        }),
  ]);
  if (!isNew && !question) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/questions" className="text-sm text-muted-foreground hover:text-brand">
        ← Ngân hàng câu hỏi
      </Link>
      <PageHeader
        title={isNew ? "Thêm câu hỏi" : "Sửa câu hỏi"}
        description={
          question ? (
            <span className="flex items-center gap-2">
              <StatusBadge map={CONTENT_STATUS} value={question.status} /> Phiên bản {question.version}
            </span>
          ) : undefined
        }
        actions={
          question && (
            <>
              {question.status !== "published" && (
                <ConfirmAction
                  action={setQuestionStatusAction.bind(null, question.id, "published")}
                  title="Xuất bản câu hỏi?"
                  description="Câu hỏi đã xuất bản được dùng cho ôn tập và tạo đề thi."
                  confirmLabel="Xuất bản"
                  trigger={<Button>Xuất bản</Button>}
                />
              )}
              {question.status === "published" && (
                <ConfirmAction
                  action={setQuestionStatusAction.bind(null, question.id, "draft")}
                  title="Ngừng xuất bản?"
                  description="Câu hỏi sẽ không còn được dùng cho ôn tập và đề thi mới."
                  confirmLabel="Ngừng xuất bản"
                  destructive
                  trigger={<Button variant="outline">Ngừng xuất bản</Button>}
                />
              )}
              {question.status !== "archived" && (
                <ConfirmAction
                  action={setQuestionStatusAction.bind(null, question.id, "archived")}
                  title="Lưu trữ câu hỏi?"
                  description="Câu hỏi bị ẩn khỏi ngân hàng đang dùng. Lịch sử bài thi cũ không bị ảnh hưởng."
                  confirmLabel="Lưu trữ"
                  destructive
                  trigger={<Button variant="ghost">Lưu trữ</Button>}
                />
              )}
            </>
          )
        }
      />
      {categories.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm">Cần tạo ít nhất một chủ đề trước khi thêm câu hỏi.</p>
      ) : (
        <QuestionForm
          id={question?.id ?? null}
          published={question?.status === "published"}
          categories={categories}
          initial={
            question
              ? {
                  categoryId: question.categoryId,
                  stem: question.stem,
                  explanation: question.explanation ?? "",
                  difficulty: question.difficulty,
                  options: question.options,
                }
              : undefined
          }
        />
      )}
      {question && question.examQuestions.length > 0 && (
        <div className="mt-6 rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">Đang dùng trong kỳ thi</p>
          <ul className="mt-2 space-y-1">
            {question.examQuestions.map((eq) => (
              <li key={eq.exam.id}>
                <Link href={`/admin/exams/${eq.exam.id}`} className="text-brand hover:underline">
                  {eq.exam.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
