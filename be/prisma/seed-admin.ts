import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();
  const email = 'admin@potato.com';
  const password = 'adminpassword';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin account already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  console.log('✅ Admin account created successfully!');
  console.log('Email: admin@potato.com');
  console.log('Password: adminpassword');
  await prisma.$disconnect();
}

main();
