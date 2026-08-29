const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      accounts: true,
      budgetItems: true,
      incomes: true,
    }
  });

  for (const user of users) {
    console.log('\n================================================================================');
    console.log(`👤 AUDIT FOR USER: @${user.username} (${user.profile?.fullName || 'No profile'}) [Role: ${user.role}]`);
    console.log('================================================================================');

    const accounts = await prisma.account.findMany({
      where: { userId: user.id }
    });

    const txCount = await prisma.transaction.count({
      where: { account: { userId: user.id } }
    });

    console.log(`🏦 Linked Accounts: ${accounts.length}`);
    for (const acc of accounts) {
      const cnt = await prisma.transaction.count({ where: { accountId: acc.id } });
      console.log(`   - ${acc.institution} | ${acc.name} (${acc.type}): ${cnt} transactions, Balance: R ${Number(acc.openingBalance || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
    }

    console.log(`\n📊 Total Transactions Recorded: ${txCount}`);

    // Get active budget months
    const budgetMonths = [...new Set(user.budgetItems.map(b => b.month))].sort();
    console.log(`📅 Configured Budget Months: ${budgetMonths.join(', ') || 'None'}`);

    // Current date and active budget cycle
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log(`🎯 Active Reference Month: ${currentMonthKey}`);

    // Budget line items for current or latest month
    const targetMonth = budgetMonths.includes(currentMonthKey) ? currentMonthKey : budgetMonths[budgetMonths.length - 1];
    const budgetItems = user.budgetItems.filter(b => b.month === targetMonth);

    console.log(`\n📋 Budget Line Items for ${targetMonth} (${budgetItems.length} items):`);
    let totalBudgeted = 0;
    for (const item of budgetItems) {
      totalBudgeted += Number(item.amount);
      console.log(`   • [${item.category}] ${item.label.padEnd(35)}: R ${Number(item.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(12)} (Confidence: ${item.confidence})`);
    }
    console.log(`   -----------------------------------------------------------------------------`);
    console.log(`   TOTAL BUDGETED EXPENDITURE        : R ${totalBudgeted.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(12)}`);

    // Let's audit bank transactions in the active month
    // Transactions in that month or last 30 days
    const transactions = await prisma.transaction.findMany({
      where: {
        account: { userId: user.id },
      },
      orderBy: { date: 'desc' },
      include: { account: true }
    });

    console.log(`\n💳 Latest Bank Transactions Audit (Total: ${transactions.length}):`);
    
    // Group transactions by date ranges / categories
    let totalDebits = 0;
    let totalCredits = 0;

    for (const tx of transactions.slice(0, 25)) {
      const amt = Number(tx.amount);
      if (amt < 0) totalDebits += Math.abs(amt);
      else totalCredits += amt;
      const sign = amt < 0 ? '-' : '+';
      console.log(`   ${tx.date.toISOString().split('T')[0]} | ${tx.account.name.padEnd(20)} | ${tx.description.padEnd(40)} | ${sign} R ${Math.abs(amt).toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(10)} | Cat: ${tx.category || 'Uncategorized'}`);
    }

    // Run matching between budget items and transactions
    console.log(`\n🔍 RECONCILIATION AUDIT: Budget Items vs Bank Outflows`);
    console.log('--------------------------------------------------------------------------------');

    let matchedCount = 0;
    let matchedAmount = 0;
    let unmatchedBudgetItems = [];

    for (const item of budgetItems) {
      const budgetAmt = Math.abs(Number(item.amount));
      const labelKeywords = item.label.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      // Look for matching transaction
      const matchedTx = transactions.find(t => {
        const txAmt = Math.abs(Number(t.amount));
        const txDesc = t.description.toLowerCase();
        // Exact amount match or keyword match with close amount
        const isAmtMatch = Math.abs(txAmt - budgetAmt) < 1.0;
        const isDescMatch = labelKeywords.some(kw => txDesc.includes(kw));
        return (isAmtMatch && isDescMatch) || (isAmtMatch && txAmt > 100);
      });

      if (matchedTx) {
        matchedCount++;
        matchedAmount += Math.abs(Number(matchedTx.amount));
        const variance = Math.abs(Number(matchedTx.amount)) - budgetAmt;
        const varianceStr = variance === 0 ? 'Exact Match (R 0.00)' : (variance > 0 ? `+R ${variance.toFixed(2)} (Over)` : `-R ${Math.abs(variance).toFixed(2)} (Under)`);
        console.log(`   ✅ [CLEARED] ${item.label.padEnd(30)} | Budget: R ${budgetAmt.toFixed(2).padStart(10)} | Actual: R ${Math.abs(Number(matchedTx.amount)).toFixed(2).padStart(10)} | ${varianceStr} | Ref: ${matchedTx.description}`);
      } else {
        unmatchedBudgetItems.push(item);
        console.log(`   ⏳ [PENDING] ${item.label.padEnd(30)} | Budget: R ${budgetAmt.toFixed(2).padStart(10)} | Actual: Pending / Unmatched`);
      }
    }

    console.log('\n📊 AUDIT SUMMARY METRICS:');
    console.log(`   - Budget Line Items Tracked       : ${budgetItems.length}`);
    console.log(`   - Cleared / Executed Obligations : ${matchedCount} / ${budgetItems.length} (${budgetItems.length > 0 ? ((matchedCount / budgetItems.length) * 100).toFixed(1) : 0}%)`);
    console.log(`   - Total Budgeted Amount          : R ${totalBudgeted.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
    console.log(`   - Total Executed Outflow         : R ${matchedAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
    console.log(`   - Outstanding / Pending Budget   : R ${(totalBudgeted - matchedAmount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  }
}

runAudit()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
