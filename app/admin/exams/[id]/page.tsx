import { BarChart3, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddExamQuestions } from "@/components/admin/AddExamQuestions";
import { AssignDealersDialog } from "@/components/admin/AssignDealersDialog";
import { ExamForm } from "@/components/admin/ExamForm";
import { ExamRankingTab } from "@/components/admin/ExamRankingTab";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";
import { HiddenFromDealersBanner } from "@/components/admin/HiddenFromDealersBanner";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  assignExamAction,
  deleteExamAction,
  removeExamQuestionAction,
  setExamStatusAction,
  unassignExamAction,
} from "@/lib/actions/admin/exams";
import { toDateTimeLocalValue } from "@/lib/date-utils";
import { isGuid, sameId } from "@/lib/ids";
import { ATTEMPT_STATUS_LABEL, CONTENT_STATUS, EXAM_STATUS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { listRegions } from "@/lib/queries/dealers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "config", label: "Cấu hình" },
  { key: "questions", label: "Bộ câu hỏi" },
  { key: "dealers", label: "Phân công đại lý" },
  { key: "ranking", label: "Xếp hạng" },
];

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; category?: string; region?: string; q?: string; page?: string; size?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  if (id === "new") {
    return (
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/exams" className="text-sm text-muted-foreground hover:text-brand">
          ← Quản lý kỳ thi
        </Link>
        <PageHeader title="Tạo kỳ thi" description="Sau khi tạo, thêm bộ câu hỏi và giao cho đại lý rồi mới xuất bản." />
        <ExamForm id={null} locked={false} />
      </div>
    );
  }
  if (!isGuid(id)) notFound();

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: { _count: { select: { attempts: true, assignments: true, questions: true } } },
  });
  if (!exam) notFound();
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "config";

  const usable = await prisma.examQuestion.count({ where: { examId: id, question: { status: "published" } } });
  const ready = usable >= exam.questionCount;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/exams" className="text-sm text-muted-foreground hover:text-brand">
        ← Quản lý kỳ thi
      </Link>
      <PageHeader
        title={exam.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge map={EXAM_STATUS} value={exam.status} />
            <ToneBadge tone={ready ? "success" : "warning"}>
              Câu hỏi khả dụng {usable}/{exam.questionCount}
            </ToneBadge>
            <ToneBadge tone={exam._count.assignments ? "success" : "warning"}>{exam._count.assignments} đại lý được giao</ToneBadge>
            <ToneBadge tone="muted">{exam._count.attempts} lượt thi</ToneBadge>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/reports?exam=${exam.id}`}>
                <BarChart3 className="size-4" /> Kết quả
              </Link>
            </Button>
            {(exam.status === "draft" || exam.status === "closed") && (
              <ConfirmAction
                action={setExamStatusAction.bind(null, exam.id, "published")}
                title={exam.status === "draft" ? "Xuất bản kỳ thi?" : "Mở lại kỳ thi?"}
                description="Đại lý được giao sẽ thấy kỳ thi và bắt đầu làm bài trong khung giờ đã cấu hình. Hệ thống kiểm tra đủ số câu hỏi đã xuất bản trước khi mở."
                confirmLabel={exam.status === "draft" ? "Xuất bản" : "Mở lại"}
                trigger={<Button>{exam.status === "draft" ? "Xuất bản" : "Mở lại"}</Button>}
              />
            )}
            {exam.status === "published" && (
              <ConfirmAction
                action={setExamStatusAction.bind(null, exam.id, "closed")}
                title="Đóng kỳ thi?"
                description="Không ai bắt đầu lượt thi mới được nữa. Lượt đang làm vẫn được làm tới hết giờ. Đáp án theo chính sách 'sau khi kỳ thi kết thúc' sẽ được công bố."
                confirmLabel="Đóng kỳ thi"
                destructive
                trigger={<Button variant="destructive">Đóng kỳ thi</Button>}
              />
            )}
            {exam.status === "draft" && exam._count.attempts === 0 && (
              <ConfirmAction
                action={deleteExamAction.bind(null, exam.id)}
                title="Xóa kỳ thi bản nháp?"
                description="Thao tác không hoàn tác được."
                confirmLabel="Xóa"
                destructive
                trigger={<Button variant="ghost">Xóa</Button>}
              />
            )}
            {exam.status === "closed" && (
              <ConfirmAction
                action={setExamStatusAction.bind(null, exam.id, "archived")}
                title="Lưu trữ kỳ thi?"
                description="Kỳ thi bị ẩn khỏi danh sách mặc định, dữ liệu kết quả vẫn được giữ."
                confirmLabel="Lưu trữ"
                trigger={<Button variant="ghost">Lưu trữ</Button>}
              />
            )}
          </>
        }
      />

      {exam.status === "draft" && (
        <HiddenFromDealersBanner
          message={
            <>
              <b>Đại lý chưa nhìn thấy kỳ thi này</b> vì kỳ thi đang là <b>Bản nháp</b>. Cần đủ {exam.questionCount} câu hỏi
              đã xuất bản (hiện có {usable}) và đã giao đại lý (hiện {exam._count.assignments}), sau đó bấm Xuất bản.
            </>
          }
          publishTitle="Xuất bản kỳ thi?"
          publishDescription="Đại lý được giao sẽ thấy kỳ thi và bắt đầu làm bài trong khung giờ đã cấu hình. Hệ thống kiểm tra đủ số câu hỏi đã xuất bản trước khi mở."
          publishAction={ready && exam._count.assignments > 0 ? setExamStatusAction.bind(null, exam.id, "published") : undefined}
        />
      )}
      <nav className="mb-5 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/exams/${exam.id}?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "config" && (
        <ExamForm
          id={exam.id}
          locked={exam._count.attempts > 0}
          initial={{
            title: exam.title,
            description: exam.description ?? "",
            questionCount: exam.questionCount,
            durationMinutes: exam.durationMinutes,
            passMarkPercent: exam.passMarkPercent,
            startsAt: toDateTimeLocalValue(exam.startsAt),
            endsAt: toDateTimeLocalValue(exam.endsAt),
            selectionMode: exam.selectionMode === "fixed" ? "fixed" : "random",
            shuffleOptions: exam.shuffleOptions,
            showScorePolicy: exam.showScorePolicy as "after_submit",
            showAnswerPolicy: exam.showAnswerPolicy as "after_submit",
            showLeaderboard: exam.showLeaderboard,
          }}
        />
      )}

      {tab === "questions" && <QuestionsTab examId={exam.id} categoryId={sp.category ?? ""} page={sp.page} size={sp.size} />}
      {tab === "dealers" && <DealersTab examId={exam.id} page={sp.page} size={sp.size} />}
      {tab === "ranking" && <ExamRankingTab examId={exam.id} region={sp.region} q={sp.q} page={sp.page} size={sp.size} />}
    </div>
  );
}

async function QuestionsTab({ examId, categoryId, page, size }: { examId: string; categoryId: string; page?: string; size?: string }) {
  const [pool, categories] = await Promise.all([
    prisma.examQuestion.findMany({
      where: { examId },
      orderBy: { sortOrder: "asc" },
      select: { sortOrder: true, question: { select: { id: true, stem: true, status: true, category: { select: { name: true } } } } },
    }),
    prisma.questionCategory.findMany({ where: { status: "active" }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const candidates = await prisma.question.findMany({
    where: {
      status: "published",
      ...(isGuid(categoryId) ? { categoryId } : {}),
      examQuestions: { none: { examId } },
    },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, stem: true },
  });
  const pageSize = parsePageSize(size);
  const poolPage = paginate(pool, parsePage(page), pageSize);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          Bộ câu hỏi ({pool.length}). Chế độ cố định dùng các câu đầu theo thứ tự này; chế độ ngẫu nhiên bốc từ toàn bộ.
        </div>
        {pool.length === 0 ? (
          <EmptyState title="Chưa có câu hỏi" className="m-4" />
        ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Câu hỏi</TableHead>
                <TableHead>Chủ đề</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {poolPage.items.map((p, i) => (
                <TableRow key={p.question.id}>
                  <TableCell>{poolPage.offset + i + 1}</TableCell>
                  <TableCell className="whitespace-normal">
                    <Link href={`/admin/questions/${p.question.id}`} className="line-clamp-2 hover:text-brand">
                      {p.question.stem}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{p.question.category.name}</TableCell>
                  <TableCell>
                    <StatusBadge map={CONTENT_STATUS} value={p.question.status} />
                  </TableCell>
                  <TableCell>
                    <ConfirmAction
                      action={removeExamQuestionAction.bind(null, examId, p.question.id)}
                      title="Gỡ câu hỏi khỏi bộ đề?"
                      description="Lượt thi đã tạo không bị ảnh hưởng."
                      confirmLabel="Gỡ"
                      destructive
                      trigger={
                        <Button size="icon-sm" variant="ghost" aria-label="Gỡ câu hỏi">
                          <X className="size-4" />
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={poolPage.page} pageSize={pageSize} total={poolPage.total} className="border-t" />
          </>
        )}
      </div>
      <AddExamQuestions examId={examId} categories={categories} candidates={candidates} categoryId={isGuid(categoryId) ? categoryId : ""} />
    </div>
  );
}

async function DealersTab({ examId, page, size }: { examId: string; page?: string; size?: string }) {
  const [assignments, attempts, regions] = await Promise.all([
    prisma.examAssignment.findMany({
      where: { examId },
      orderBy: { dealer: { code: "asc" } },
      select: { dealer: { select: { id: true, code: true, name: true, region: true, status: true } } },
    }),
    prisma.examAttempt.findMany({ where: { examId, status: { not: "Voided" } }, select: { dealerId: true, status: true } }),
    listRegions(),
  ]);
  const pageSize = parsePageSize(size);
  const assignedPage = paginate(assignments, parsePage(page), pageSize);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm text-muted-foreground">{assignments.length} đại lý được giao</span>
        <AssignDealersDialog title="Giao kỳ thi cho đại lý" regions={regions} action={assignExamAction.bind(null, examId)} />
      </div>
      {assignments.length === 0 ? (
        <EmptyState title="Chưa giao cho đại lý nào" className="m-4" />
      ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Đại lý</TableHead>
              <TableHead>Khu vực</TableHead>
              <TableHead>Lượt thi</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignedPage.items.map(({ dealer }) => {
              const attempt = attempts.find((a) => sameId(a.dealerId, dealer.id));
              return (
                <TableRow key={dealer.id}>
                  <TableCell className="font-mono text-xs">{dealer.code}</TableCell>
                  <TableCell>{dealer.name}</TableCell>
                  <TableCell>{dealer.region ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge map={ATTEMPT_STATUS_LABEL} value={attempt?.status ?? "NotStarted"} />
                  </TableCell>
                  <TableCell className="text-right">
                    {!attempt && (
                      <ConfirmAction
                        action={unassignExamAction.bind(null, examId, dealer.id)}
                        title="Bỏ giao kỳ thi?"
                        description={`Đại lý ${dealer.code} sẽ không thấy kỳ thi này nữa.`}
                        confirmLabel="Bỏ giao"
                        destructive
                        trigger={
                          <Button size="icon-sm" variant="ghost" aria-label="Bỏ giao">
                            <X className="size-4" />
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={assignedPage.page} pageSize={pageSize} total={assignedPage.total} className="border-t" />
        </>
      )}
    </div>
  );
}
