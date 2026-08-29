const http = require('http');

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function auditUser(host, username, password) {
  console.log(`\n================================================================================`);
  console.log(`🔐 AUTHENTICATING AUDIT SESSION FOR: @${username} on ${host}`);
  console.log(`================================================================================`);

  // 1. Login
  const loginRes = await request(`http://${host}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, password });

  if (loginRes.status !== 200 || !loginRes.headers['set-cookie']) {
    console.error(`❌ Authentication failed for @${username}:`, loginRes.body);
    return null;
  }

  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  const authHeaders = { 'Cookie': cookie };

  // 2. Get User Details
  const meRes = await request(`http://${host}/api/auth/me`, { headers: authHeaders });
  const user = meRes.body.user;
  console.log(`👤 Profile: ${user.fullName || user.username} (${user.email}) | Role: ${user.role}`);

  // 3. Fetch Budget & Reconciliation
  const budgetRes = await request(`http://${host}/api/budget`, { headers: authHeaders });
  const budgetData = budgetRes.body;

  // 4. Fetch Banking Transactions
  const txRes = await request(`http://${host}/api/transactions`, { headers: authHeaders });
  const txData = txRes.body;

  // 5. Fetch Accounts & Debts
  const accRes = await request(`http://${host}/api/accounts`, { headers: authHeaders });
  const accounts = accRes.body.accounts || [];

  return {
    user,
    budgetMonth: budgetData.month,
    budgetItems: budgetData.items || [],
    budgetSummary: budgetData.summary,
    transactions: txData.transactions || [],
    accounts
  };
}

async function main() {
  const host = process.env.AUDIT_HOST || '13.61.15.20';
  console.log(`🚀 STARTING COMPREHENSIVE BANKING & BUDGET AUDIT ENGINE (Host: ${host})`);

  const resultsMokhotm = await auditUser(host, 'mokhotm', 'Engim002@85590');
  
  if (resultsMokhotm) {
    printAuditReport(resultsMokhotm);
  }

  const resultsMokhotb = await auditUser(host, 'mokhotb', 'Engim002@85590');
  if (resultsMokhotb) {
    printAuditReport(resultsMokhotb);
  }
}

function printAuditReport(data) {
  const { user, budgetMonth, budgetItems, budgetSummary, transactions, accounts } = data;

  console.log(`\n================================================================================`);
  console.log(`📑 COMPREHENSIVE AUDIT REPORT: @${user.username} | Cycle: ${budgetMonth}`);
  console.log(`================================================================================`);

  // Accounts Overview
  console.log(`\n🏦 1. LINKED BANK ACCOUNTS & LIQUIDITY:`);
  let totalLiquid = 0;
  let totalDebt = 0;
  for (const acc of accounts) {
    const bal = Number(acc.currentBalance ?? acc.openingBalance ?? 0);
    if (acc.isDebt) totalDebt += Math.abs(bal);
    else totalLiquid += bal;
    console.log(`   • ${acc.institution.padEnd(20)} | ${acc.name.padEnd(28)} (${acc.type.padEnd(12)}): R ${bal.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(14)}`);
  }
  console.log(`   -----------------------------------------------------------------------------`);
  console.log(`   TOTAL LIQUID DEPOSITS             : R ${totalLiquid.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(14)}`);
  console.log(`   TOTAL LIABILITIES / DEBT BALANCES : R ${totalDebt.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(14)}`);

  // Budget Reconciliation Summary
  console.log(`\n📊 2. MONTHLY BUDGET RECONCILIATION SUMMARY (Cycle: ${budgetMonth}):`);
  if (budgetSummary) {
    console.log(`   • Budget Cycle Range             : ${budgetSummary.cycleRangeFormatted || budgetMonth}`);
    console.log(`   • Total Monthly Budgeted Outflow : R ${Number(budgetSummary.totalBudgeted || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
    console.log(`   • Cleared Statement Outflow      : R ${Number(budgetSummary.totalExecuted || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${Number(budgetSummary.executionPercentage || 0).toFixed(1)}% cleared)`);
    console.log(`   • Pending / Remaining Obligations: R ${Number(budgetSummary.totalPending || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
    if (budgetSummary.totalBounced > 0) {
      console.log(`   ⚠️ BOUNCED / DISHONORED ITEMS    : R ${Number(budgetSummary.totalBounced || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${budgetSummary.bouncedCount} items)`);
    }
    console.log(`   • Obligation Clearance Count     : ${budgetSummary.executedCount} / ${budgetSummary.totalItemsCount} items cleared`);
  }

  // Budget Items Breakdown by Category
  console.log(`\n📋 3. BUDGET OBLIGATION AUDIT (Line Item vs Cleared Bank Outflow):`);
  const categories = [...new Set(budgetItems.map(i => i.category))];

  for (const cat of categories) {
    const itemsInCat = budgetItems.filter(i => i.category === cat);
    console.log(`\n   🔹 Category: ${cat} (${itemsInCat.length} items)`);
    console.log(`   ` + `-`.repeat(85));
    console.log(`   ${'Status'.padEnd(10)} | ${'Budget Item Label'.padEnd(30)} | ${'Budgeted'.padStart(12)} | ${'Cleared'.padStart(12)} | ${'Variance'.padStart(12)} | Matched Bank Ref`);
    console.log(`   ` + `-`.repeat(85));

    for (const item of itemsInCat) {
      const exec = item.execution || {};
      const statusIcon = exec.executionStatus === 'CLEARED' ? '✅ CLEARED' : (exec.executionStatus === 'BOUNCED' ? '❌ BOUNCED' : '⏳ PENDING');
      const bAmt = Number(item.amount || 0);
      const eAmt = Number(exec.executedAmount || 0);
      const varAmt = Number(exec.variance || (eAmt - bAmt));
      const varStr = exec.isExecuted ? (varAmt === 0 ? 'R 0.00' : (varAmt > 0 ? `+R ${varAmt.toFixed(2)}` : `-R ${Math.abs(varAmt).toFixed(2)}`)) : '---';
      const ref = exec.executionRef || exec.rawMatchedDescription || 'No cleared debit order found yet';

      console.log(`   ${statusIcon.padEnd(10)} | ${item.label.padEnd(30).slice(0, 30)} | R ${bAmt.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(10)} | R ${eAmt.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(10)} | ${varStr.padStart(12)} | ${ref.slice(0, 35)}`);
    }
  }

  // Bank Transactions Breakdown
  console.log(`\n💳 4. LATEST BANK TRANSACTIONS (Total Cleared in Statement: ${transactions.length}):`);
  const settledOutflows = transactions.filter(t => t.direction === 'OUTFLOW');
  const settledInflows = transactions.filter(t => t.direction === 'INFLOW');
  
  const totalOutflowAmt = settledOutflows.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalInflowAmt = settledInflows.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  console.log(`   • Total Inflows Recorded   : R ${totalInflowAmt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${settledInflows.length} transactions)`);
  console.log(`   • Total Outflows Recorded  : R ${totalOutflowAmt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${settledOutflows.length} transactions)`);
  console.log(`   • Net Cash Flow Position   : R ${(totalInflowAmt - totalOutflowAmt).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  console.log(`\n   🔍 Top Inflows:`);
  for (const t of settledInflows.slice(0, 5)) {
    console.log(`      + ${t.date} | ${t.merchantName.padEnd(30)} | R ${Number(t.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(12)} | ${t.accountName}`);
  }

  console.log(`\n   🔍 Unbudgeted or Discretionary Outflows (Not matched to fixed recurring items):`);
  const unbudgetedTx = settledOutflows.filter(t => !t.isBudgeted || t.budgetStatus === 'UNBUDGETED');
  for (const t of unbudgetedTx.slice(0, 10)) {
    console.log(`      - ${t.date} | ${t.merchantName.padEnd(30)} | R ${Number(t.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(12)} | Cat: ${(t.category || 'General').padEnd(16)} | ${t.accountName}`);
  }
}

main().catch(console.error);
