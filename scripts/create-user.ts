import { prisma } from "../lib/prisma";
import { hashPassword, passwordProblem } from "../lib/password";

async function main() {
  const [name, email, password, role = "admin"] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Cách dùng: npm run user:create -- "<họ tên>" <email> <mật khẩu> [admin]');
    process.exit(1);
  }
  if (role !== "admin") {
    console.error("Script chỉ tạo tài khoản quản trị. Tài khoản đại lý tạo trong /admin/dealers hoặc import.");
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    create: { name, email: email.toLowerCase(), role: "admin", passwordHash: await hashPassword(password), mustChangePassword: true },
    update: { name, role: "admin", status: "active", passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  console.log(`Đã tạo/cập nhật quản trị viên ${user.email}. Phải đổi mật khẩu ở lần đăng nhập đầu.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
