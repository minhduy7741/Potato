const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('🔄 Đang cập nhật Database để loại bỏ vai trò hệ thống Org Manager và bảng RoleConfig...');

  try {
    // 1. Drop RoleConfig
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "RoleConfig" CASCADE`);
    console.log('  - Đã xóa bảng RoleConfig');

    // 2. Chuyển đổi toàn bộ tài khoản có vai trò ORG_MANAGER sang DEVELOPER
    await prisma.$executeRawUnsafe(`UPDATE "User" SET "role" = 'DEVELOPER' WHERE "role"::text = 'ORG_MANAGER'`);
    console.log('  - Đã chuyển các tài khoản Org Manager hệ thống sang Developer');

    // 3. Thay thế Enum Role cũ
    await prisma.$executeRawUnsafe(`CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DEVELOPER')`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new"`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER'`);
    await prisma.$executeRawUnsafe(`DROP TYPE "Role"`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "Role_new" RENAME TO "Role"`);
    console.log('  - Đã cập nhật Enum Role trong CSDL (Chỉ còn ADMIN và DEVELOPER)');

    console.log('🎉 Cập nhật CSDL thành công!');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
