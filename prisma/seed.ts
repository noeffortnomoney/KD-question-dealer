import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { finalizeAttempt, saveAnswer, startAttempt } from "../lib/exam/engine";
import { SEED_CATEGORIES, SEED_DEALERS } from "./seed-data";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function wipe() {
  await prisma.auditLog.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.practiceAnswer.deleteMany();
  await prisma.practiceSession.deleteMany();
  await prisma.attemptAnswer.deleteMany();
  await prisma.attemptQuestion.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.examAssignment.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionCategory.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.materialProgress.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.courseMaterial.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dealer.deleteMany();
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Không chạy seed trên production");
  await wipe();
  const now = new Date();

  const admin = await prisma.user.create({
    data: {
      email: "admin@kymdan.local",
      name: "Quản trị viên",
      role: "admin",
      passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "Admin@123"),
    },
  });

  const dealerHash = await hashPassword("Dealer@123");
  const dealers = [];
  for (const d of SEED_DEALERS) {
    dealers.push(
      await prisma.dealer.create({
        data: {
          code: d.code,
          name: d.name,
          region: d.region,
          phone: d.phone,
          users: { create: { email: d.email, name: d.user, role: "dealer", passwordHash: dealerHash } },
        },
        include: { users: true },
      })
    );
  }

  const questionIds: string[] = [];
  for (const [ci, cat] of SEED_CATEGORIES.entries()) {
    const category = await prisma.questionCategory.create({ data: { name: cat.name, sortOrder: ci } });
    for (const q of cat.questions) {
      const created = await prisma.question.create({
        data: {
          categoryId: category.id,
          stem: q.stem,
          explanation: q.explanation,
          difficulty: q.difficulty ?? 2,
          status: "published",
          publishedAt: now,
          createdById: admin.id,
          options: {
            create: q.options.map((text, i) => ({ text, isCorrect: i === q.correct, sortOrder: i + 1 })),
          },
        },
      });
      questionIds.push(created.id);
    }
  }

  const courses = [
    {
      title: "Giới thiệu sản phẩm nệm cao su",
      description: "Tổng quan danh mục sản phẩm, đặc tính chất liệu và cách tư vấn chọn nệm phù hợp.",
      materials: ["Tổng quan dòng sản phẩm", "Bảng kích thước tiêu chuẩn", "Video hướng dẫn tư vấn tại cửa hàng"],
      sessions: [{ title: "Giới thiệu sản phẩm mới", offset: 2 * DAY + 3 * HOUR }],
    },
    {
      title: "Kỹ năng tư vấn bán hàng",
      description: "Kỹ năng tìm hiểu nhu cầu, xử lý phản đối và chăm sóc sau bán.",
      materials: ["Quy trình tư vấn 5 bước", "Tình huống xử lý phản đối thường gặp"],
      sessions: [
        { title: "Kỹ năng tư vấn bán hàng", offset: 4 * DAY + 7 * HOUR },
        { title: "Chăm sóc khách hàng sau bán", offset: -3 * DAY },
      ],
    },
    {
      title: "Chính sách bán hàng & bảo hành",
      description: "Cập nhật chính sách bán hàng, quy trình bảo hành và chương trình khuyến mãi.",
      materials: ["Quy trình tiếp nhận bảo hành", "Chính sách trưng bày cửa hàng"],
      sessions: [{ title: "Cập nhật chính sách bán hàng", offset: 6 * DAY + 3 * HOUR }],
    },
  ];

  for (const [i, c] of courses.entries()) {
    const course = await prisma.course.create({
      data: {
        title: c.title,
        description: c.description,
        status: "published",
        publishedAt: now,
        createdById: admin.id,
        materials: {
          create: c.materials.map((title, mi) => ({
            title,
            kind: "link",
            url: `https://example.com/kymdan-demo/tai-lieu-${i + 1}-${mi + 1}`,
            sortOrder: mi + 1,
            isRequired: mi === 0,
          })),
        },
        sessions: {
          create: c.sessions.map((s) => {
            const start = new Date(Math.round((now.getTime() + s.offset) / HOUR) * HOUR);
            return {
              title: s.title,
              presenterName: "Phòng Đào tạo",
              startsAt: start,
              endsAt: new Date(start.getTime() + 1.5 * HOUR),
              meetUrl: "https://meet.google.com/abc-defg-hij",
              status: s.offset < 0 ? "completed" : "scheduled",
            };
          }),
        },
        enrollments: { create: dealers.map((d) => ({ dealerId: d.id })) },
      },
      include: { materials: true },
    });
    if (i === 0) {
      await prisma.materialProgress.create({
        data: { materialId: course.materials[0].id, dealerId: dealers[0].id, completedAt: now },
      });
    }
  }

  const official = await prisma.exam.create({
    data: {
      title: "Kỳ thi kiến thức sản phẩm (demo)",
      description: "Kỳ thi chính thức demo: 30 câu, trộn thứ tự câu và đáp án cho từng đại lý.",
      status: "published",
      startsAt: new Date(now.getTime() - DAY),
      endsAt: new Date(now.getTime() + 14 * DAY),
      selectionMode: "random",
      shuffleOptions: true,
      showScorePolicy: "after_submit",
      showAnswerPolicy: "after_exam_ends",
      createdById: admin.id,
      questions: { create: questionIds.slice(10).map((questionId, i) => ({ questionId, sortOrder: i + 1 })) },
      assignments: { create: dealers.map((d) => ({ dealerId: d.id })) },
    },
  });

  const closedExam = await prisma.exam.create({
    data: {
      title: "Kỳ thi kỹ năng tư vấn (đã kết thúc)",
      description: "Kỳ thi demo đã đóng, đáp án đã được công bố.",
      status: "published",
      startsAt: new Date(now.getTime() - 10 * DAY),
      endsAt: new Date(now.getTime() + DAY),
      selectionMode: "fixed",
      shuffleOptions: false,
      showScorePolicy: "after_submit",
      showAnswerPolicy: "after_exam_ends",
      createdById: admin.id,
      questions: { create: questionIds.slice(0, 30).map((questionId, i) => ({ questionId, sortOrder: i + 1 })) },
      assignments: { create: dealers.map((d) => ({ dealerId: d.id })) },
    },
  });

  for (const [di, d] of dealers.slice(0, 4).entries()) {
    const start = await startAttempt(closedExam.id, { userId: d.users[0].id, dealerId: d.id });
    if (!start.ok || !start.data.questions) throw new Error(`Không tạo được lượt thi demo: ${JSON.stringify(start)}`);
    let seq = 0;
    for (const [qi, q] of start.data.questions.entries()) {
      const qs = await prisma.attemptQuestion.findUnique({ where: { id: q.attemptQuestionId }, select: { snapshot: true } });
      const correct = JSON.parse(qs!.snapshot).correctOptionId as string;
      const wrong = q.options.find((o) => o.optionId !== correct)!.optionId;
      const pickCorrect = qi < 30 - (di * 4 + 2);
      await saveAnswer({
        attemptId: start.data.attemptId,
        dealerId: d.id,
        attemptQuestionId: q.attemptQuestionId,
        selectedOptionId: pickCorrect ? correct : wrong,
        clientSeq: ++seq,
      });
    }
    await finalizeAttempt(start.data.attemptId, "Submitted");
    await prisma.examAttempt.update({
      where: { id: start.data.attemptId },
      data: {
        startedAt: new Date(now.getTime() - (5 - di) * DAY),
        submittedAt: new Date(now.getTime() - (5 - di) * DAY + (30 + di * 3) * 60_000),
        finishedAt: new Date(now.getTime() - (5 - di) * DAY + (30 + di * 3) * 60_000),
      },
    });
  }
  await prisma.exam.update({
    where: { id: closedExam.id },
    data: { status: "closed", endsAt: new Date(now.getTime() - DAY) },
  });

  await prisma.exam.create({
    data: {
      title: "Kỳ thi chính sách bán hàng Q4 (bản nháp)",
      status: "draft",
      startsAt: new Date(now.getTime() + 20 * DAY),
      endsAt: new Date(now.getTime() + 27 * DAY),
      createdById: admin.id,
      questions: { create: questionIds.slice(10, 25).map((questionId, i) => ({ questionId, sortOrder: i + 1 })) },
    },
  });

  console.log(
    `Seed xong: admin@kymdan.local / ${process.env.SEED_ADMIN_PASSWORD ? "(SEED_ADMIN_PASSWORD trong .env.local)" : "Admin@123"}; dealer01..05@kymdan.local / Dealer@123`
  );
  console.log(`Kỳ thi đang mở: ${official.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
