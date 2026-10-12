import { Pencil, Plus, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignDealersDialog } from "@/components/admin/AssignDealersDialog";
import { CourseForm } from "@/components/admin/CourseForm";
import { HiddenFromDealersBanner } from "@/components/admin/HiddenFromDealersBanner";
import { MaterialManager } from "@/components/admin/MaterialManager";
import { SessionDialog } from "@/components/admin/SessionDialog";
import { ConfirmAction } from "@/components/common/ConfirmAction";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, ToneBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  enrollCourseAction,
  setCourseStatusAction,
  setSessionStatusAction,
  unenrollCourseAction,
} from "@/lib/actions/admin/courses";
import { formatDateTime, formatTime, toDateTimeLocalValue } from "@/lib/date-utils";
import { isGuid, sameId } from "@/lib/ids";
import { CONTENT_STATUS } from "@/lib/labels";
import { SESSION_PHASE_LABEL, sessionPhase } from "@/lib/session-status";
import { prisma } from "@/lib/prisma";
import { listRegions } from "@/lib/queries/dealers";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/common/Pagination";
import { paginate, parsePage, parsePageSize } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "materials", label: "Tài liệu" },
  { key: "sessions", label: "Lịch training" },
  { key: "dealers", label: "Đại lý & tiến độ" },
];

export default async function AdminCourseDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; page?: string; size?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  if (id === "new") {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/courses" className="text-sm text-muted-foreground hover:text-brand">
          ← Khóa đào tạo
        </Link>
        <PageHeader title="Tạo khóa học" />
        <CourseForm id={null} />
      </div>
    );
  }
  if (!isGuid(id)) notFound();

  const course = await prisma.course.findUnique({
    where: { id },
    include: { _count: { select: { enrollments: true, materials: true, sessions: true } } },
  });
  if (!course) notFound();
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "info";

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/courses" className="text-sm text-muted-foreground hover:text-brand">
        ← Khóa đào tạo
      </Link>
      <PageHeader
        title={course.title}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge map={CONTENT_STATUS} value={course.status} />
            <ToneBadge tone="muted">{course._count.enrollments} đại lý được giao</ToneBadge>
          </span>
        }
        actions={
          <>
            {course.status !== "published" && (
              <ConfirmAction
                action={setCourseStatusAction.bind(null, course.id, "published")}
                title="Xuất bản khóa học?"
                description="Đại lý được giao sẽ thấy khóa học, tài liệu và lịch training."
                confirmLabel="Xuất bản"
                trigger={<Button>Xuất bản</Button>}
              />
            )}
            {course.status === "published" && (
              <ConfirmAction
                action={setCourseStatusAction.bind(null, course.id, "draft")}
                title="Ngừng xuất bản?"
                description="Đại lý sẽ không thấy khóa học này nữa."
                confirmLabel="Ngừng xuất bản"
                destructive
                trigger={<Button variant="outline">Ngừng xuất bản</Button>}
              />
            )}
            {course.status !== "archived" && (
              <ConfirmAction
                action={setCourseStatusAction.bind(null, course.id, "archived")}
                title="Lưu trữ khóa học?"
                description="Khóa học bị ẩn khỏi danh sách. Dữ liệu tiến độ vẫn được giữ."
                confirmLabel="Lưu trữ"
                destructive
                trigger={<Button variant="ghost">Lưu trữ</Button>}
              />
            )}
          </>
        }
      />
      {course.status !== "published" && (
        <HiddenFromDealersBanner
          message={
            <>
              <b>Đại lý chưa nhìn thấy khóa học này</b> vì khóa học đang ở trạng thái{" "}
              <b>{course.status === "archived" ? "Lưu trữ" : "Bản nháp"}</b>.{" "}
              {course._count.enrollments > 0
                ? `${course._count.enrollments} đại lý đã được giao sẽ thấy khóa học, tài liệu và lịch training ngay khi bạn xuất bản.`
                : "Hãy giao đại lý ở tab \"Đại lý & tiến độ\" rồi xuất bản."}
            </>
          }
          publishTitle="Xuất bản khóa học?"
          publishDescription="Đại lý được giao sẽ thấy khóa học, tài liệu và lịch training."
          publishAction={setCourseStatusAction.bind(null, course.id, "published")}
        />
      )}
      <nav className="mb-5 flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/courses/${course.id}?tab=${t.key}`}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              tab === t.key ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "info" && <CourseForm id={course.id} initial={{ title: course.title, description: course.description ?? "" }} />}
      {tab === "materials" && <MaterialsTab courseId={course.id} enrolled={course._count.enrollments} />}
      {tab === "sessions" && <SessionsTab courseId={course.id} page={sp.page} size={sp.size} />}
      {tab === "dealers" && <DealersTab courseId={course.id} page={sp.page} size={sp.size} />}
    </div>
  );
}

async function MaterialsTab({ courseId, enrolled }: { courseId: string; enrolled: number }) {
  const materials = await prisma.courseMaterial.findMany({
    where: { courseId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      kind: true,
      url: true,
      fileName: true,
      isRequired: true,
      _count: { select: { progress: { where: { completedAt: { not: null } } } } },
    },
  });
  return (
    <MaterialManager
      courseId={courseId}
      enrolled={enrolled}
      materials={materials.map((m) => ({ ...m, completedCount: m._count.progress }))}
    />
  );
}

async function SessionsTab({ courseId, page, size }: { courseId: string; page?: string; size?: string }) {
  const enrolled = await prisma.courseEnrollment.count({ where: { courseId } });
  const allSessions = await prisma.trainingSession.findMany({
    where: { courseId },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      presenterName: true,
      startsAt: true,
      endsAt: true,
      meetUrl: true,
      status: true,
      _count: { select: { attendances: true } },
    },
  });
  const pageSize = parsePageSize(size);
  const { items: sessions, page: current, total } = paginate(allSessions, parsePage(page), pageSize);
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm text-muted-foreground">{total} buổi training</span>
        <SessionDialog
          courseId={courseId}
          trigger={
            <Button>
              <Plus className="size-4" /> Thêm buổi training
            </Button>
          }
        />
      </div>
      {total === 0 ? (
        <EmptyState title="Chưa có lịch training" className="m-4" />
      ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Buổi training</TableHead>
              <TableHead>Thời gian</TableHead>
              <TableHead>Link Meet</TableHead>
              <TableHead className="text-right">Đã tham gia</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.presenterName}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDateTime(s.startsAt)} – {formatTime(s.endsAt)}
                </TableCell>
                <TableCell className="max-w-48 truncate text-xs">
                  <a href={s.meetUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    {s.meetUrl}
                  </a>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/training-sessions/${s.id}`} className="font-medium text-brand hover:underline">
                    {s._count.attendances}/{enrolled} · Điểm danh
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge map={SESSION_PHASE_LABEL} value={sessionPhase(s)} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <SessionDialog
                      courseId={courseId}
                      sessionId={s.id}
                      initial={{
                        title: s.title,
                        presenterName: s.presenterName ?? "",
                        startsAt: toDateTimeLocalValue(s.startsAt),
                        endsAt: toDateTimeLocalValue(s.endsAt),
                        meetUrl: s.meetUrl,
                      }}
                      trigger={
                        <Button size="icon-sm" variant="ghost" aria-label="Sửa">
                          <Pencil className="size-4" />
                        </Button>
                      }
                    />
                    {s.status === "scheduled" ? (
                      <ConfirmAction
                        action={setSessionStatusAction.bind(null, s.id, "cancelled")}
                        title="Hủy buổi training?"
                        description="Đại lý sẽ không thấy buổi này nữa."
                        confirmLabel="Hủy buổi"
                        destructive
                        trigger={
                          <Button size="icon-sm" variant="ghost" aria-label="Hủy buổi">
                            <X className="size-4" />
                          </Button>
                        }
                      />
                    ) : (
                      <ConfirmAction
                        action={setSessionStatusAction.bind(null, s.id, "scheduled")}
                        title="Khôi phục buổi training?"
                        description="Buổi training hiển thị lại cho đại lý."
                        confirmLabel="Khôi phục"
                        trigger={<Button size="sm" variant="ghost">Khôi phục</Button>}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={current} pageSize={pageSize} total={total} className="border-t" />
        </>
      )}
    </div>
  );
}

async function DealersTab({ courseId, page, size }: { courseId: string; page?: string; size?: string }) {
  const [enrollments, materials, progress, regions] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { courseId },
      orderBy: { dealer: { code: "asc" } },
      select: { completedAt: true, dealer: { select: { id: true, code: true, name: true, region: true } } },
    }),
    prisma.courseMaterial.findMany({ where: { courseId }, select: { id: true } }),
    prisma.materialProgress.findMany({
      where: { material: { courseId }, completedAt: { not: null } },
      select: { dealerId: true },
    }),
    listRegions(),
  ]);
  const pageSize = parsePageSize(size);
  const enrolledPage = paginate(enrollments, parsePage(page), pageSize);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {enrollments.length} đại lý · {enrollments.filter((e) => e.completedAt).length} đã hoàn thành
        </span>
        <AssignDealersDialog title="Giao khóa học cho đại lý" regions={regions} action={enrollCourseAction.bind(null, courseId)} />
      </div>
      {enrollments.length === 0 ? (
        <EmptyState title="Chưa giao cho đại lý nào" className="m-4" />
      ) : (
        <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Đại lý</TableHead>
              <TableHead>Khu vực</TableHead>
              <TableHead>Tiến độ</TableHead>
              <TableHead>Hoàn thành</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrolledPage.items.map((e) => {
              const done = progress.filter((p) => sameId(p.dealerId, e.dealer.id)).length;
              const pct = materials.length ? Math.round((done / materials.length) * 100) : 0;
              return (
                <TableRow key={e.dealer.id}>
                  <TableCell className="font-mono text-xs">{e.dealer.code}</TableCell>
                  <TableCell>{e.dealer.name}</TableCell>
                  <TableCell>{e.dealer.region ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex w-40 items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{formatDateTime(e.completedAt, "—")}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmAction
                      action={unenrollCourseAction.bind(null, courseId, e.dealer.id)}
                      title="Bỏ giao khóa học?"
                      description={`Đại lý ${e.dealer.code} sẽ không thấy khóa học này nữa.`}
                      confirmLabel="Bỏ giao"
                      destructive
                      trigger={
                        <Button size="icon-sm" variant="ghost" aria-label="Bỏ giao">
                          <X className="size-4" />
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={enrolledPage.page} pageSize={pageSize} total={enrolledPage.total} className="border-t" />
        </>
      )}
    </div>
  );
}
