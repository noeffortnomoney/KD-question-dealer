import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

const PASSWORD = process.env.LOADTEST_PASSWORD ?? "LoadTest@123";
const PREFIX = "LT";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Không chạy trên production");
  const count = Number(process.argv[2] ?? 1000);
  const examId = process.argv[3];
  if (!Number.isInteger(count) || count < 1 || count > 5000) throw new Error("Số tài khoản 1–5000");

  const hash = await hashPassword(PASSWORD);
  const mine = { dealer: { code: { startsWith: PREFIX } } };
  await prisma.attemptAnswer.deleteMany({ where: { attempt: mine } });
  await prisma.attemptQuestion.deleteMany({ where: { attempt: mine } });
  const removed = await prisma.examAttempt.deleteMany({ where: mine });
  if (removed.count) console.log(`Đã xóa ${removed.count} lượt thi cũ của tài khoản loadtest`);

  for (let i = 1; i <= count; i++) {
    const code = `${PREFIX}${String(i).padStart(4, "0")}`;
    const email = `loadtest-${i}@example.test`;
    const dealer = await prisma.dealer.upsert({
      where: { code },
      create: { code, name: `Loadtest ${i}`, region: "Loadtest", users: { create: { email, name: `Loadtest ${i}`, role: "dealer", passwordHash: hash } } },
      update: {},
      select: { id: true },
    });
    if (examId) {
      await prisma.examAssignment.upsert({
        where: { examId_dealerId: { examId, dealerId: dealer.id } },
        create: { examId, dealerId: dealer.id },
        update: {},
      });
    }
    if (i % 100 === 0) console.log(`${i}/${count}`);
  }
  console.log(`Xong ${count} tài khoản loadtest-{n}@example.test / ${PASSWORD}${examId ? `, đã giao kỳ thi ${examId}` : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
