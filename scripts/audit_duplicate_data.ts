import { prisma } from '../src/lib/prisma';

interface DuplicateReport {
  entity: string;
  duplicateGroupsCount: number;
  totalDuplicateRecords: number;
  samples: any[];
}

export async function auditDuplicationForUser(userUsername = 'mokhotm') {
  const user = await prisma.user.findFirst({ where: { username: userUsername } });
  if (!user) {
    console.error(`User ${userUsername} not found.`);
    return null;
  }

  const reports: DuplicateReport[] = [];

  // 1. Audit MoneyFlow Duplicates
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const debts = await prisma.debt.findMany({ where: { account: { userId: user.id } } });
  const { buildUserFlowWhere } = await import('../src/lib/moneyFlowRefs');
  const userFlowWhere = buildUserFlowWhere(accounts, debts);

  const allFlows = await prisma.moneyFlow.findMany({
    where: userFlowWhere.OR.length > 0 ? userFlowWhere : {},
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total MoneyFlow records for ${userUsername}: ${allFlows.length}`);

  // Exact duplicate signature: (amount, dateStr, sourceRef, destinationRef, description)
  const exactFlowMap = new Map<string, typeof allFlows>();
  // Approximate/Semantic duplicate signature: (amount, date (YYYY-MM), destinationRef / merchant, flowType)
  const monthlySalaryFlowMap = new Map<string, typeof allFlows>();
  // General monthly recurrent duplicate signature: (amount, YYYY-MM, description/destinationRef)
  const monthlyRecurrentMap = new Map<string, typeof allFlows>();

  for (const f of allFlows) {
    const dStr = f.createdAt.toISOString().slice(0, 10);
    const mStr = f.createdAt.toISOString().slice(0, 7);
    const amt = Number(f.amount).toFixed(2);
    const desc = (f.description || f.destinationRef || '').trim().toLowerCase();
    
    // Exact duplicate key
    const exactKey = `${amt}|${dStr}|${(f.sourceRef || '').trim()}|${(f.destinationRef || '').trim()}|${(f.description || '').trim()}`;
    if (!exactFlowMap.has(exactKey)) exactFlowMap.set(exactKey, []);
    exactFlowMap.get(exactKey)!.push(f);

    // Salary specific duplicate check (Inflow >= 50k in the same month)
    if (Number(f.amount) >= 50000 && f.flowType === 'INCOME') {
      const salaryKey = `SALARY|${mStr}|${amt}`;
      if (!monthlySalaryFlowMap.has(salaryKey)) monthlySalaryFlowMap.set(salaryKey, []);
      monthlySalaryFlowMap.get(salaryKey)!.push(f);
    }

    // Check same-day same-amount duplicates
    const sameDayKey = `${amt}|${dStr}|${desc}`;
    if (!monthlyRecurrentMap.has(sameDayKey)) monthlyRecurrentMap.set(sameDayKey, []);
    monthlyRecurrentMap.get(sameDayKey)!.push(f);
  }

  const exactFlowDupes = Array.from(exactFlowMap.entries()).filter(([_, list]) => list.length > 1);
  const salaryDupes = Array.from(monthlySalaryFlowMap.entries()).filter(([_, list]) => list.length > 1);
  const sameDayDupes = Array.from(monthlyRecurrentMap.entries()).filter(([_, list]) => list.length > 1);

  reports.push({
    entity: 'MoneyFlow (Exact Signatures)',
    duplicateGroupsCount: exactFlowDupes.length,
    totalDuplicateRecords: exactFlowDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: exactFlowDupes.slice(0, 10).map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, amount: Number(r.amount), date: r.createdAt.toISOString(), desc: r.description || r.destinationRef }))
    }))
  });

  reports.push({
    entity: 'MoneyFlow (Salary Inflows >= 50k in same month)',
    duplicateGroupsCount: salaryDupes.length,
    totalDuplicateRecords: salaryDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: salaryDupes.map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, amount: Number(r.amount), date: r.createdAt.toISOString(), desc: r.description || r.destinationRef, sourceRef: r.sourceRef, destinationRef: r.destinationRef }))
    }))
  });

  reports.push({
    entity: 'MoneyFlow (Same Date & Same Amount & Same Desc)',
    duplicateGroupsCount: sameDayDupes.length,
    totalDuplicateRecords: sameDayDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: sameDayDupes.slice(0, 10).map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, amount: Number(r.amount), date: r.createdAt.toISOString(), desc: r.description || r.destinationRef }))
    }))
  });

  // 2. Audit BudgetLineItem Duplicates
  const budgetItems = await prisma.budgetLineItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' }
  });

  const budgetMap = new Map<string, typeof budgetItems>();
  for (const b of budgetItems) {
    const key = `${b.month || 'GLOBAL'}|${b.category}|${b.label.trim().toLowerCase()}|${Number(b.amount).toFixed(2)}`;
    if (!budgetMap.has(key)) budgetMap.set(key, []);
    budgetMap.get(key)!.push(b);
  }
  const budgetDupes = Array.from(budgetMap.entries()).filter(([_, list]) => list.length > 1);

  reports.push({
    entity: 'BudgetLineItem',
    duplicateGroupsCount: budgetDupes.length,
    totalDuplicateRecords: budgetDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: budgetDupes.slice(0, 10).map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, month: r.month, label: r.label, amount: Number(r.amount) }))
    }))
  });

  // 3. Audit Account Duplicates
  const accountMap = new Map<string, typeof accounts>();
  for (const a of accounts) {
    const key = `${a.name.trim().toLowerCase()}|${a.institution.trim().toLowerCase()}|${a.accountNumberMasked || ''}`;
    if (!accountMap.has(key)) accountMap.set(key, []);
    accountMap.get(key)!.push(a);
  }
  const accountDupes = Array.from(accountMap.entries()).filter(([_, list]) => list.length > 1);

  reports.push({
    entity: 'Account',
    duplicateGroupsCount: accountDupes.length,
    totalDuplicateRecords: accountDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: accountDupes.slice(0, 10).map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, name: r.name, institution: r.institution }))
    }))
  });

  // 4. Audit Goal Duplicates
  const goals = await prisma.goal.findMany({
    where: { userId: user.id }
  });
  const goalMap = new Map<string, typeof goals>();
  for (const g of goals) {
    const key = `${g.name.trim().toLowerCase()}|${g.type}`;
    if (!goalMap.has(key)) goalMap.set(key, []);
    goalMap.get(key)!.push(g);
  }
  const goalDupes = Array.from(goalMap.entries()).filter(([_, list]) => list.length > 1);

  reports.push({
    entity: 'Goal',
    duplicateGroupsCount: goalDupes.length,
    totalDuplicateRecords: goalDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: goalDupes.slice(0, 10).map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, name: r.name, type: r.type, target: Number(r.targetAmount) }))
    }))
  });

  // 5. Audit Income Duplicates
  const incomes = await prisma.income.findMany({
    where: { userId: user.id }
  });
  const incomeMap = new Map<string, typeof incomes>();
  for (const inc of incomes) {
    const key = `${inc.sourceName.trim().toLowerCase()}|${Number(inc.recurringAmount).toFixed(2)}`;
    if (!incomeMap.has(key)) incomeMap.set(key, []);
    incomeMap.get(key)!.push(inc);
  }
  const incomeDupes = Array.from(incomeMap.entries()).filter(([_, list]) => list.length > 1);

  reports.push({
    entity: 'Income',
    duplicateGroupsCount: incomeDupes.length,
    totalDuplicateRecords: incomeDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: incomeDupes.map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, source: r.sourceName, amount: Number(r.recurringAmount) }))
    }))
  });

  // 6. Audit Document Duplicates
  const docs = await prisma.document.findMany({
    where: {
      relatedEntityId: { in: accounts.map((a) => a.id) }
    }
  });
  const docMap = new Map<string, typeof docs>();
  for (const d of docs) {
    const key = `${d.fileUrl}|${d.documentType}|${d.periodStart?.toISOString()}|${d.periodEnd?.toISOString()}`;
    if (!docMap.has(key)) docMap.set(key, []);
    docMap.get(key)!.push(d);
  }
  const docDupes = Array.from(docMap.entries()).filter(([_, list]) => list.length > 1);

  reports.push({
    entity: 'Document',
    duplicateGroupsCount: docDupes.length,
    totalDuplicateRecords: docDupes.reduce((acc, [_, list]) => acc + list.length - 1, 0),
    samples: docDupes.map(([k, list]) => ({
      key: k,
      count: list.length,
      records: list.map(r => ({ id: r.id, title: r.title, filename: r.fileName }))
    }))
  });

  return reports;
}

auditDuplicationForUser('mokhotm')
  .then(reports => {
    console.log('\n============================================================');
    console.log('             📊 DUPLICATION AUDIT REPORT 📊');
    console.log('============================================================\n');
    console.log(JSON.stringify(reports, null, 2));
  })
  .catch(console.error);
