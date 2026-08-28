const { reconcileBudgetItemsForMonth } = require('../src/lib/budgetReconciliation');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testReconciliation() {
  const user = await prisma.user.findFirst({ where: { username: 'mokhotm' } });
  const items = await prisma.budgetLineItem.findMany({ where: { userId: user.id, month: '2026-08' } });
  
  console.log('Total budget items fetched for 2026-08:', items.length);
  const result = await reconcileBudgetItemsForMonth(user.id, '2026-08', items);
  
  const ekurhuleniItems = result.items.filter(i => i.label.toLowerCase().includes('ekurhuleni') || i.label.toLowerCase().includes('municipal'));
  console.log('\n=== EKURHULENI & MUNICIPAL BUDGET ITEMS RECONCILIATION RESULT ===');
  for (const item of ekurhuleniItems) {
    console.log(`- Label: ${item.label}`);
    console.log(`  Budget: R ${item.amount}`);
    console.log(`  Status: ${item.execution.executionStatus}`);
    console.log(`  Cleared Amount: R ${item.execution.executedAmount}`);
    console.log(`  Matched Ref: ${item.execution.executionRef}`);
    console.log(`  Variance: R ${item.execution.variance}`);
    console.log('');
  }
}

testReconciliation()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
