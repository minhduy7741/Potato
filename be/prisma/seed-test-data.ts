import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Seeding Test Data...');

  // 1. Ensure Admin User exists
  const adminEmail = 'admin@potato.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    const hashedPassword = await bcrypt.hash('adminpassword', 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Admin',
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created.');
  }

  // 1.5 Ensure Regular User exists
  const userEmail = 'user@potato.com';
  let regularUser = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!regularUser) {
    const hashedPassword = await bcrypt.hash('userpassword', 10);
    regularUser = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        name: 'Regular Dev',
        role: 'USER',
      },
    });
    console.log('✅ Regular user created.');
  } else {
    const hashedPassword = await bcrypt.hash('userpassword', 10);
    regularUser = await prisma.user.update({
      where: { email: userEmail },
      data: { password: hashedPassword },
    });
    console.log('✅ Regular user password force reset to "userpassword".');
  }

  // 2. Clear existing test data to avoid conflicts
  await prisma.databaseInstance.deleteMany();
  await prisma.project.deleteMany({ where: { userId: { in: [admin.id, regularUser.id] } } });

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

  console.log('✅ Seeding complete! 4 projects and 3 databases created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
