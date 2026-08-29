const { reconcileBudgetItemsForMonth } = require('../src/lib/budgetReconciliation');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
  const user = await prisma.user.findFirst({ where: { username: 'mokhotm' } });
  const items = await prisma.budgetLineItem.findMany({ where: { userId: user.id, month: '2026-08' } });
  const result = await reconcileBudgetItemsForMonth(user.id, '2026-08', items);
  
  console.log('=== RECONCILIATION SUMMARY ===');
  console.log(`Total Budgeted: R ${result.summary.totalBudgeted.toFixed(2)}`);
  console.log(`Total Executed: R ${result.summary.totalExecuted.toFixed(2)}`);
  console.log(`Execution %: ${result.summary.executionPercentage.toFixed(1)}%`);
  console.log(`Cleared Count: ${result.summary.executedCount} / ${result.summary.totalItemsCount}`);
  
  console.log('\n=== LINE ITEMS AUDIT ===');
  for (const item of result.items) {
    const statusIcon = item.execution.executionStatus === 'CLEARED' ? '✅' : item.execution.executionStatus === 'PARTIAL' ? '⚠️' : '⏳';
    console.log(`${statusIcon} [${item.execution.executionStatus}] ${item.label}`);
    console.log(`   Budget: R ${item.amount} | Cleared: R ${item.execution.executedAmount || 0} | Ref: ${item.execution.executionRef || 'N/A'}`);
  }
}

checkAll()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
