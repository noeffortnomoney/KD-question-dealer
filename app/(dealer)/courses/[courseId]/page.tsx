import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneBadge } from "@/components/common/StatusBadge";
import { MaterialItem } from "@/components/learning/MaterialItem";
import { SessionRow } from "@/components/learning/SessionRow";
import { requireDealer } from "@/lib/auth-guard";
import { getCourseForDealer } from "@/lib/queries/learning";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const g = await requireDealer();
  if ("error" in g) redirect("/login");
  const { courseId } = await params;
  const course = await getCourseForDealer(courseId, g.dealerId);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/courses" className="text-sm text-muted-foreground hover:text-brand">
        ← Khóa đào tạo
      </Link>
      <div className="mt-3 rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <ToneBadge tone={course.completed ? "success" : "brand"}>{course.completed ? "Đã hoàn thành" : "Đang học"}</ToneBadge>
        </div>
        {course.description && <p className="mt-2 whitespace-pre-line text-muted-foreground">{course.description}</p>}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 rounded-full bg-muted">
            <div className="h-2.5 rounded-full bg-success" style={{ width: `${course.percent}%` }} />
          </div>
          <span className="text-sm font-semibold">
            {course.completedMaterials}/{course.materials.length} tài liệu · {course.percent}%
          </span>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Tài liệu</h2>
        {course.materials.length === 0 ? (
          <EmptyState title="Chưa có tài liệu" />
        ) : (
          <div className="space-y-3">
            {course.materials.map((m) => (
              <MaterialItem key={m.id} material={m} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Lịch training</h2>
        {course.sessions.length === 0 ? (
          <EmptyState title="Chưa có lịch training" />
        ) : (
          <div className="space-y-3">
            {course.sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
