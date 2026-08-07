const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const user = await p.user.findFirst({ where: { username: 'mokhotm' } });
  if (!user) { console.log("No user"); return; }

  // 1. Incomes
  const incomes = await p.income.findMany({ where: { userId: user.id } });
  console.log("=== INCOMES ===");
  let incomeTotal = 0;
  incomes.forEach(i => {
    console.log(`  ${i.source}: R${Number(i.recurringAmount).toFixed(2)} (${i.frequency})`);
    incomeTotal += Number(i.recurringAmount);
  });
  console.log(`  -> Sum of recurringAmounts: R${incomeTotal.toFixed(2)}`);
  console.log(`  -> With seed offset 71026.9: R${(incomeTotal + 71026.9).toFixed(2)}`);

  // 2. Accounts
  const accounts = await p.account.findMany({ where: { userId: user.id } });
  console.log("\n=== ACCOUNTS ===");
  accounts.forEach(a => {
    console.log(`  [${a.type}] ${a.name} (id=${a.id}): balance=R${Number(a.balance).toFixed(2)}`);
  });

  // 3. Debts with minimum payments
  const debts = await p.debt.findMany({
    where: { account: { userId: user.id } },
    include: { account: true },
  });
  console.log("\n=== DEBTS ===");
  let debtMinTotal = 0;
  debts.forEach(d => {
    console.log(`  ${d.account.name}: R${Number(d.currentBalance).toFixed(2)} (minPay=R${Number(d.minimumPayment).toFixed(2)}) id=${d.id}`);
    debtMinTotal += Number(d.minimumPayment);
  });
  console.log(`  -> Total minimumPayments: R${debtMinTotal.toFixed(2)}`);

  // 4. Bank Statements / Transactions
  const statements = await p.bankStatement.findMany({
    where: { userId: user.id },
    include: { transactions: true },
    orderBy: { uploadedAt: 'desc' },
    take: 5
  });
  console.log(`\n=== BANK STATEMENTS (${statements.length}) ===`);
  statements.forEach(s => {
    console.log(`  Statement: ${s.originalFilename} uploaded=${s.uploadedAt}`);
    console.log(`    Account: ${s.accountId}`);
    console.log(`    Transactions: ${s.transactions.length}`);
    
    let credits = 0, debits = 0;
    s.transactions.forEach(t => {
      const amt = Number(t.amount);
      if (amt > 0) credits += amt;
      else debits += Math.abs(amt);
    });
    console.log(`    Credits total: R${credits.toFixed(2)}`);
    console.log(`    Debits total: R${debits.toFixed(2)}`);
    
    // Show salary credits
    const salaryTxns = s.transactions.filter(t => {
      const desc = (t.description || '').toLowerCase();
      return desc.includes('salary') || desc.includes('employer') || desc.includes('payroll') || Number(t.amount) > 10000;
    });
    if (salaryTxns.length > 0) {
      console.log(`    Large/Salary transactions:`);
      salaryTxns.forEach(t => {
        console.log(`      ${t.date}: ${t.description} R${Number(t.amount).toFixed(2)}`);
      });
    }
  });

  // 5. Cash Wallet
  const cashWallets = await p.cashWallet.findMany();
  console.log("\n=== CASH WALLETS ===");
  cashWallets.forEach(w => {
    console.log(`  ${w.name}: balance=R${Number(w.balance).toFixed(2)}, totalIn=R${Number(w.totalDeposited).toFixed(2)}, totalOut=R${Number(w.totalWithdrawn).toFixed(2)}`);
  });

  // 6. Cross reference: Flow amounts vs DB data
  console.log("\n=== CROSS-REFERENCE: FLOW DB vs SOURCE DATA ===");
  
  // The seed script computes salary as: incomes.reduce((s, i) => s + Number(i.recurringAmount), 71026.9)
  // This is 71026.90 PLUS the sum of all income recurring amounts!
  const computedSalary = incomes.reduce((s, i) => s + Number(i.recurringAmount), 71026.9);
  console.log(`Seed salary calculation: 71026.9 + sum(incomes.recurringAmount)=${incomeTotal.toFixed(2)} = R${computedSalary.toFixed(2)}`);
  console.log(`  -> This means the seed ADDS 71026.9 as an initial accumulator to the income reduce!`);
  console.log(`  -> Is 71026.9 a real salary amount or just a seed starting value?`);

  // Transfer: hardcoded R15,000
  console.log(`\nTransfer to savings: HARDCODED R15,000.00 in seed script`);
  
  // Debt payments: each debt's minimumPayment
  console.log(`\nDebt payments: Uses each debt.minimumPayment -> total R${debtMinTotal.toFixed(2)}`);
  
  // Cash: hardcoded R2,500 withdrawal, R1,250 spending
  console.log(`\nCash withdrawal: HARDCODED R2,500.00 in seed script`);
  console.log(`Cash spending: HARDCODED R1,250.00 in seed script`);

  // Sum: what the salary covers
  const allocated = 15000 + debtMinTotal + 2500;
  console.log(`\nTotal allocated from salary: R${allocated.toFixed(2)} (transfers + debt + cash)`);
  console.log(`Salary: R${computedSalary.toFixed(2)}`);
  console.log(`Unallocated: R${(computedSalary - allocated).toFixed(2)}`);

  await p.$disconnect();
})();
