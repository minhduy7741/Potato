const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Danh sách 13 quyền hệ thống
const ALL_PERMISSIONS = [
  'project:read', 'project:start', 'project:stop', 'project:restart',
  'project:hibernate', 'project:delete', 'project:settings', 'project:resources',
  'project:deploy', 'env:read', 'env:write', 'member:manage', 'database:manage'
];

// Mỗi bước là một câu SQL đơn và mô tả để dễ theo dõi
const steps = [
  {
    desc: 'Tạo Enum ProjectMemberRole',
    sql: `CREATE TYPE "ProjectMemberRole" AS ENUM ('LEADER', 'MEMBER')`,
  },
  {
    desc: 'Tạo bảng CustomRole',
    sql: `CREATE TABLE "CustomRole" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "permissions" TEXT[] NOT NULL,
      "assignableByManager" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    desc: 'Tạo unique index cho CustomRole.name',
    sql: `CREATE UNIQUE INDEX "CustomRole_name_key" ON "CustomRole"("name")`,
  },
  {
    desc: 'Tạo bảng ProjectMember',
    sql: `CREATE TABLE "ProjectMember" (
      "id" SERIAL NOT NULL,
      "userId" INTEGER NOT NULL,
      "projectId" INTEGER NOT NULL,
      "role" "ProjectMemberRole" NOT NULL DEFAULT 'MEMBER',
      "permissions" TEXT[] NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
    )`,
  },
  {
    desc: 'Tạo unique index cho ProjectMember (userId, projectId)',
    sql: `CREATE UNIQUE INDEX "ProjectMember_userId_projectId_key" ON "ProjectMember"("userId", "projectId")`,
  },
  {
    desc: 'Thêm FK ProjectMember -> User',
    sql: `ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    desc: 'Thêm FK ProjectMember -> Project',
    sql: `ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  },
  {
    desc: 'Thêm cột customRoleId vào User',
    sql: `ALTER TABLE "User" ADD COLUMN "customRoleId" INTEGER`,
  },
  {
    desc: 'Thêm FK User -> CustomRole',
    sql: `ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  },
  {
    desc: 'Tạo Enum Role_new',
    sql: `CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'ORG_MANAGER', 'DEVELOPER')`,
  },
  {
    desc: 'Bỏ default cũ cột role',
    sql: `ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`,
  },
  {
    desc: 'Convert kiểu cột role từ Role cũ sang Role_new (USER -> DEVELOPER)',
    sql: `ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
      CASE
        WHEN "role"::text = 'USER' THEN 'DEVELOPER'::"Role_new"
        ELSE "role"::text::"Role_new"
      END
    )`,
  },
  {
    desc: 'Đặt default mới cho role = DEVELOPER',
    sql: `ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER'`,
  },
  {
    desc: 'Xóa Enum Role cũ',
    sql: `DROP TYPE "Role"`,
  },
  {
    desc: 'Đổi tên Role_new -> Role',
    sql: `ALTER TYPE "Role_new" RENAME TO "Role"`,
  },
  {
    desc: 'Seed dữ liệu: thêm chủ dự án làm LEADER với đủ 13 quyền',
    sql: `INSERT INTO "ProjectMember" ("userId", "projectId", "role", "permissions")
      SELECT "userId", "id", 'LEADER'::"ProjectMemberRole",
        ARRAY['project:read','project:start','project:stop','project:restart','project:hibernate','project:delete','project:settings','project:resources','project:deploy','env:read','env:write','member:manage','database:manage']::text[]
      FROM "Project"
      ON CONFLICT DO NOTHING`,
  },
];

async function run() {
  console.log('🔄 Đang kết nối tới cơ sở dữ liệu qua Prisma Client...\n');
  const total = steps.length;
  let ok = 0, skipped = 0, failed = 0;

  for (let i = 0; i < steps.length; i++) {
    const { desc, sql } = steps[i];
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`  [${i + 1}/${total}] ✅ ${desc}`);
      ok++;
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate key') ||
        msg.includes('does not exist') ||
        msg.includes('column') && msg.includes('of relation') && msg.includes('already exists')
      ) {
        console.log(`  [${i + 1}/${total}] ⚠️  Bỏ qua (đã áp dụng): ${desc}`);
        skipped++;
      } else {
        console.error(`  [${i + 1}/${total}] ❌ Lỗi: ${desc}`);
        console.error(`     → ${(err.message || '').split('\n')[0]}`);
        failed++;
      }
    }
  }

  console.log(`\n──────────────────────────────────`);
  console.log(`✅ Thành công: ${ok}   ⚠️  Bỏ qua: ${skipped}   ❌ Lỗi: ${failed}`);
  if (failed === 0) {
    console.log('🎉 Migration RBAC hoàn tất thành công!');
  } else {
    console.log('⚠️  Có một số bước lỗi, vui lòng kiểm tra lại ở trên.');
  }

  await prisma.$disconnect();
  console.log('🔌 Đã ngắt kết nối.');
}

run();
