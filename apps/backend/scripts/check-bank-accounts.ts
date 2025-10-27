import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.bankAccount.findMany({
    include: { areas: true }
  });
  console.log(JSON.stringify(accounts, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
