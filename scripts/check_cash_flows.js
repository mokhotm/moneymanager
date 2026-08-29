const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCashFlows() {
  const user = await prisma.user.findFirst({ where: { username: 'mokhotm' } });
  const flows = await prisma.moneyFlow.findMany({
    where: {
      OR: [
        { destinationRef: { contains: 'Domestic', mode: 'insensitive' } },
        { destinationRef: { contains: 'Garden', mode: 'insensitive' } },
        { destinationRef: { contains: 'Cash', mode: 'insensitive' } },
        { flowType: 'CASH_SPENDING' },
        { flowType: 'CASH_WITHDRAWAL' }
      ]
    }
  });
  console.log('Found cash flows:', flows.length);
  for (const f of flows) {
    console.log(`- ID: ${f.id} | Type: ${f.flowType} | Amount: R ${f.amount} | From: ${f.sourceRef} -> To: ${f.destinationRef} | Date: ${f.createdAt.toISOString().slice(0,10)}`);
  }
}

checkCashFlows()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
