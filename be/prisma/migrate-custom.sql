-- 1. Khởi tạo Enum ProjectMemberRole
CREATE TYPE "ProjectMemberRole" AS ENUM ('LEADER', 'MEMBER');

-- 2. Tạo bảng CustomRole với cột permissions kiểu text[]
CREATE TABLE "CustomRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" TEXT[] NOT NULL,
    "assignableByManager" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- Khởi tạo unique index cho tên vai trò tùy chọn
CREATE UNIQUE INDEX "CustomRole_name_key" ON "CustomRole"("name");

-- 3. Tạo bảng trung gian ProjectMember với cột permissions kiểu text[]
CREATE TABLE "ProjectMember" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'MEMBER',
    "permissions" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- Khởi tạo unique index để tránh một thành viên trùng lặp trong một dự án
CREATE UNIQUE INDEX "ProjectMember_userId_projectId_key" ON "ProjectMember"("userId", "projectId");

-- Thiết lập ràng buộc khóa ngoại (ForeignKey) cho ProjectMember
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Thêm trường customRoleId vào bảng User và thiết lập khóa ngoại
ALTER TABLE "User" ADD COLUMN "customRoleId" INTEGER;
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Cập nhật và thay đổi Enum Role một cách an toàn (chuyển USER -> DEVELOPER)
-- Tạo Enum tạm thời Role_new
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'ORG_MANAGER', 'DEVELOPER');

-- Thay đổi kiểu dữ liệu cột role trong bảng User và map giá trị cũ USER sang DEVELOPER
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE 
    WHEN "role"::text = 'USER' THEN 'DEVELOPER'::"Role_new"
    ELSE "role"::text::"Role_new"
  END
);
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER';

-- Xóa enum Role cũ và đổi tên enum tạm thời thành Role chính thức
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- 6. Tự động chuyển đổi dữ liệu cũ: Gán tất cả người tạo dự án (userId trên Project) làm LEADER của dự án tương ứng
-- Với quyền là mảng đầy đủ 13 hành động
INSERT INTO "ProjectMember" ("userId", "projectId", "role", "permissions")
SELECT "userId", "id", 'LEADER'::"ProjectMemberRole", 
  ARRAY['project:read', 'project:start', 'project:stop', 'project:restart', 'project:hibernate', 'project:delete', 'project:settings', 'project:resources', 'project:deploy', 'env:read', 'env:write', 'member:manage', 'database:manage']::text[]
FROM "Project"
ON CONFLICT DO NOTHING;
