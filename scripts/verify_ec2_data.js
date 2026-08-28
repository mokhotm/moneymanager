const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({ include: { profile: true } });
  const accounts = await prisma.account.count();
  const flows = await prisma.moneyFlow.count();
  const debts = await prisma.debt.count();
  const budgets = await prisma.budgetLineItem.count();
  const docs = await prisma.document.count();

  console.log('--- EC2 DATABASE VERIFICATION ---');
  console.log('Users:', users.map(u => ({ username: u.username, email: u.email, role: u.role, fullName: u.profile?.fullName })));
  console.log('Total Accounts:', accounts);
  console.log('Total MoneyFlows:', flows);
  console.log('Total Debts:', debts);
  console.log('Total Budget Items:', budgets);
  console.log('Total Documents:', docs);
}

check().finally(() => prisma.$disconnect());
