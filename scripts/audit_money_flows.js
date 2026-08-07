const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const flows = await p.moneyFlow.findMany({ orderBy: { createdAt: 'desc' } });
  
  console.log("=== ALL MONEY FLOW RECORDS ===");
  console.log(`Total records: ${flows.length}\n`);
  
  flows.forEach((f, i) => {
    console.log(`[${i+1}] id=${f.id}`);
    console.log(`    parentFlowId=${f.parentFlowId}`);
    console.log(`    source: ${f.sourceType} -> ${f.sourceRef}`);
    console.log(`    destination: ${f.destinationType} -> ${f.destinationRef}`);
    console.log(`    amount=${f.amount}  currentAmount=${f.currentAmount}`);
    console.log(`    flowType=${f.flowType}  status=${f.status}  confidence=${f.confidence}`);
    console.log(`    originTransactionId=${f.originTransactionId}`);
    console.log(`    createdAt=${f.createdAt}`);
    console.log("");
  });

  // Summary aggregations
  const income = flows.filter(f => f.flowType === 'INCOME');
  const transfers = flows.filter(f => f.flowType === 'TRANSFER');
  const investments = flows.filter(f => f.flowType === 'INVESTMENT' || f.flowType === 'GOAL_CONTRIBUTION');
  const debtPayments = flows.filter(f => f.flowType === 'DEBT_PAYMENT');
  const cashWithdrawal = flows.filter(f => f.flowType === 'CASH_WITHDRAWAL');
  const cashSpending = flows.filter(f => f.flowType === 'CASH_SPENDING');

  const sumOf = (arr) => arr.reduce((s, f) => s + Number(f.amount), 0);

  console.log("=== SUMMARY AGGREGATIONS ===");
  console.log(`INCOME: ${income.length} records, total = R${sumOf(income).toFixed(2)}`);
  income.forEach(f => console.log(`   - ${f.sourceRef || f.sourceType} -> ${f.destinationRef || f.destinationType}: R${Number(f.amount).toFixed(2)}`));

  console.log(`\nTRANSFER: ${transfers.length} records, total = R${sumOf(transfers).toFixed(2)}`);
  transfers.forEach(f => console.log(`   - ${f.sourceRef || f.sourceType} -> ${f.destinationRef || f.destinationType}: R${Number(f.amount).toFixed(2)}`));

  console.log(`\nINVESTMENT/GOAL: ${investments.length} records, total = R${sumOf(investments).toFixed(2)}`);
  investments.forEach(f => console.log(`   - ${f.sourceRef || f.sourceType} -> ${f.destinationRef || f.destinationType}: R${Number(f.amount).toFixed(2)}`));

  console.log(`\nDEBT_PAYMENT: ${debtPayments.length} records, total = R${sumOf(debtPayments).toFixed(2)}`);
  debtPayments.forEach(f => console.log(`   - ${f.sourceRef || f.sourceType} -> ${f.destinationRef || f.destinationType}: R${Number(f.amount).toFixed(2)}`));

  console.log(`\nCASH_WITHDRAWAL: ${cashWithdrawal.length} records, total = R${sumOf(cashWithdrawal).toFixed(2)}`);
  cashWithdrawal.forEach(f => console.log(`   - ${f.sourceRef || f.sourceType} -> ${f.destinationRef || f.destinationType}: R${Number(f.amount).toFixed(2)}`));

  console.log(`\nCASH_SPENDING: ${cashSpending.length} records, total = R${sumOf(cashSpending).toFixed(2)}`);
  cashSpending.forEach(f => console.log(`   - ${f.sourceRef || f.sourceType} -> ${f.destinationRef || f.destinationType}: R${Number(f.amount).toFixed(2)}`));

  console.log(`\n=== GRAND TOTAL (all amounts) ===`);
  console.log(`R${sumOf(flows).toFixed(2)}`);

  // Check for potential duplicates: same source, dest, amount
  console.log("\n=== DUPLICATE CHECK ===");
  const seen = new Map();
  flows.forEach(f => {
    const key = `${f.sourceType}:${f.sourceRef}|${f.destinationType}:${f.destinationRef}|${Number(f.amount).toFixed(2)}|${f.flowType}`;
    if (seen.has(key)) {
      seen.get(key).push(f);
    } else {
      seen.set(key, [f]);
    }
  });
  let duplicatesFound = false;
  for (const [key, group] of seen.entries()) {
    if (group.length > 1) {
      duplicatesFound = true;
      console.log(`DUPLICATE (${group.length}x): ${key}`);
      group.forEach(f => console.log(`   id=${f.id} parentFlowId=${f.parentFlowId} created=${f.createdAt}`));
    }
  }
  if (!duplicatesFound) console.log("No exact duplicates found.");

  // Now also check parent-child relationships for double-counting
  console.log("\n=== PARENT-CHILD FLOW ANALYSIS ===");
  const rootFlows = flows.filter(f => !f.parentFlowId);
  const childFlows = flows.filter(f => f.parentFlowId);
  console.log(`Root flows (no parent): ${rootFlows.length}, total = R${sumOf(rootFlows).toFixed(2)}`);
  console.log(`Child flows (have parent): ${childFlows.length}, total = R${sumOf(childFlows).toFixed(2)}`);
  
  // For each root flow, show its children
  rootFlows.forEach(root => {
    const children = flows.filter(f => f.parentFlowId === root.id);
    if (children.length > 0) {
      console.log(`\nRoot: ${root.flowType} R${Number(root.amount).toFixed(2)} (${root.sourceRef || root.sourceType} -> ${root.destinationRef || root.destinationType})`);
      console.log(`  Children (${children.length}):`);
      const childSum = sumOf(children);
      children.forEach(c => {
        console.log(`    ${c.flowType} R${Number(c.amount).toFixed(2)} (${c.sourceRef || c.sourceType} -> ${c.destinationRef || c.destinationType})`);
      });
      console.log(`  Root amount: R${Number(root.amount).toFixed(2)}, Sum of children: R${childSum.toFixed(2)}`);
      if (Math.abs(Number(root.amount) - childSum) > 0.01) {
        console.log(`  ⚠️  MISMATCH: Root doesn't equal sum of children!`);
      }
    }
  });

  await p.$disconnect();
})();
