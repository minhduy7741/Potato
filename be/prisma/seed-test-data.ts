import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seeding Test Data...');

  // 1. Ensure Super Admin User exists
  const superadminEmail = 'superadmin@potato.com';
  let superadmin = await prisma.user.findUnique({ where: { email: superadminEmail } });
  const hashedSuperPassword = await bcrypt.hash('superadminpassword', 10);
  if (!superadmin) {
    superadmin = await prisma.user.create({
      data: {
        email: superadminEmail,
        password: hashedSuperPassword,
        name: 'Super Admin',
        role: 'ADMIN',
      },
    });
    console.log('✅ Super Admin user created.');
  } else {
    superadmin = await prisma.user.update({
      where: { email: superadminEmail },
      data: { password: hashedSuperPassword, role: 'ADMIN' },
    });
    console.log('✅ Super Admin user updated.');
  }

  // 2. Ensure Admin User exists (initially without custom role)
  const adminEmail = 'admin@potato.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const hashedAdminPassword = await bcrypt.hash('adminpassword', 10);
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedAdminPassword,
        name: 'Enterprise Admin',
        role: 'DEVELOPER',
      },
    });
    console.log('✅ Admin user created.');
  } else {
    admin = await prisma.user.update({
      where: { email: adminEmail },
      data: { password: hashedAdminPassword, role: 'DEVELOPER' },
    });
    console.log('✅ Admin user updated.');
  }

  // 3. Ensure Custom Role "Admin" exists with system permissions, owned by Admin
  let adminCustomRole = await prisma.customRole.findUnique({ where: { name: 'Admin' } });
  const systemPermissions = [
    'system:project:create',
    'system:user:manage',
    'system:infrastructure:read',
    'system:role:manage',
    'project:read',
    'project:start',
    'project:stop',
    'project:restart',
    'project:hibernate',
    'project:delete',
    'project:settings',
    'project:resources',
    'project:deploy',
    'env:read',
    'env:write',
    'member:manage'
  ];

  if (!adminCustomRole) {
    adminCustomRole = await prisma.customRole.create({
      data: {
        name: 'Admin',
        permissions: systemPermissions,
        assignableByManager: true,
        ownerId: admin.id,
      },
    });
    console.log('✅ Custom Role "Admin" created.');
  } else {
    adminCustomRole = await prisma.customRole.update({
      where: { id: adminCustomRole.id },
      data: { permissions: systemPermissions, ownerId: admin.id },
    });
    console.log('✅ Custom Role "Admin" updated.');
  }

  // Update Admin user to associate with Custom Role
  admin = await prisma.user.update({
    where: { id: admin.id },
    data: { customRoleId: adminCustomRole.id },
  });
  console.log('✅ Associated Admin user with Custom Role.');

  // 4. Ensure Regular User exists, parented by Admin
  const userEmail = 'user@potato.com';
  let regularUser = await prisma.user.findUnique({ where: { email: userEmail } });
  const hashedUserPassword = await bcrypt.hash('userpassword', 10);
  if (!regularUser) {
    regularUser = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedUserPassword,
        name: 'Regular User',
        role: 'DEVELOPER',
        parentId: admin.id,
        customRoleId: null,
      },
    });
    console.log('✅ Regular user created.');
  } else {
    regularUser = await prisma.user.update({
      where: { email: userEmail },
      data: { password: hashedUserPassword, role: 'DEVELOPER', parentId: admin.id, customRoleId: null },
    });
    console.log('✅ Regular user updated.');
  }

  // 5. Clear existing test data to avoid conflicts
  await prisma.databaseInstance.deleteMany();
  await prisma.project.deleteMany({ where: { userId: { in: [superadmin.id, admin.id, regularUser.id] } } });

  const now = new Date();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  // 3. Create Projects
  
  // Project 1: Healthy & Secure
  const p1 = await prisma.project.create({
    data: {
      name: 'Potato-Production',
      status: 'running',
      subdomain: 'prod-potato',
      customDomain: 'potato.io',
      sslStatus: 'active',
      sslExpiry: new Date(now.getTime() + ninetyDays),
      userId: admin.id,
      databases: {
        create: [
          { name: 'main-db', type: 'postgres', status: 'running', connectionString: 'postgresql://postgres:potato123@localhost:20001/main' }
        ]
      }
    }
  });

  // Project 2: Expiring Soon
  const p2 = await prisma.project.create({
    data: {
      name: 'Sprout-App',
      status: 'running',
      subdomain: 'sprout-app',
      customDomain: 'sprout.site',
      sslStatus: 'expiring_soon',
      sslExpiry: new Date(now.getTime() + threeDays),
      userId: admin.id,
      databases: {
        create: [
          { name: 'session-cache', type: 'redis', status: 'running', connectionString: 'redis://:potato123@localhost:20002' }
        ]
      }
    }
  });

  // Project 3: Stopped & Local
  const p3 = await prisma.project.create({
    data: {
      name: 'Garden-Legacy',
      status: 'stopped',
      subdomain: 'legacy-garden',
      sslStatus: 'none',
      userId: admin.id,
    }
  });

  // Project 4: User Project (Dành cho tài khoản user thường)
  const p4 = await prisma.project.create({
    data: {
      name: 'User-App-Plot',
      status: 'running',
      subdomain: 'user-app',
      sslStatus: 'none',
      userId: regularUser.id,
      databases: {
        create: [
          { name: 'user-db', type: 'mysql', status: 'running', connectionString: 'mysql://root:potato123@localhost:20003/userdb' }
        ]
      }
    }
  });

  // Tạo membership cho regularUser trong Potato-Production (p1) làm VIEWER để test
  await prisma.projectMember.create({
    data: {
      projectId: p1.id,
      userId: regularUser.id,
      role: 'VIEWER',
      permissions: [],
    },
  });

  console.log('✅ Seeding complete! 4 projects, 3 databases and 1 member created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
