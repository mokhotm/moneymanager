import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const userId = 'cml8x5mqu0000vv5c7n4k5b2p';
  const budgetItems = await prisma.budgetLineItem.findMany({ where: { userId } });
  console.log('=== BUDGET LINE ITEMS COUNT:', budgetItems.length);
  budgetItems.forEach(b => console.log(`• [${b.category}] ${b.label}: R${b.amount} (${b.month})`));

  const allTx = await prisma.transaction.findMany({
    where: { userId },
    take: 50,
  });
  console.log('\n=== TOTAL TRANSACTIONS IN DB:', allTx.length);

  const subTx = await prisma.transaction.findMany({
    where: {
      userId,
      OR: [
        { description: { contains: 'Netflix', mode: 'insensitive' } },
        { description: { contains: 'Google', mode: 'insensitive' } },
        { description: { contains: 'Spotify', mode: 'insensitive' } },
        { description: { contains: 'Apple', mode: 'insensitive' } },
      ]
    }
  });
  console.log('\n=== MATCHING RECURRING SUB TRANSACTIONS IN DB:', subTx.length);
  subTx.forEach(t => console.log(`• ${t.date.toISOString().slice(0, 10)} | ${t.description} | R${t.amount}`));
}

check().catch(console.error).finally(() => prisma.$disconnect());
