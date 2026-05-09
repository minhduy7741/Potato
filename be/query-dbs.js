const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dbs = await prisma.databaseInstance.findMany();
  console.log(JSON.stringify(dbs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
