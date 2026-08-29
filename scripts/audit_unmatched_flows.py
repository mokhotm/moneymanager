import subprocess
import json

pem_key = r'C:\Ezzy\Projects\Money\Artifacts\SesosaWebServerKey.pem'
ec2_host = 'ubuntu@16.171.199.75'

def run_ssh(cmd):
    full_cmd = ['ssh', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', ec2_host, cmd]
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout + res.stderr

script = """
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { SA_MERCHANT_RULES, DIGITAL_SERVICE_PATTERNS } = require('./src/lib/geoResolver');
const fs = require('fs');

async function audit() {
  const flows = await prisma.moneyFlow.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('Total MoneyFlow rows:', flows.length);

  const matchedPhysical = [];
  const matchedDigital = [];
  const unmatchedOutflows = [];
  const debtOrTransfers = [];
  const incomeFlows = [];

  for (const f of flows) {
    const rawDest = (f.destinationRef || '').trim();
    const rawSrc = (f.sourceRef || '').trim();
    const combined = `${rawDest} ${rawSrc}`;
    const amount = Number(f.amount || f.currentAmount || 0);
    const flowType = f.flowType;

    if (flowType === 'INCOME') {
      incomeFlows.push(f);
      continue;
    }

    if (flowType === 'DEBT_PAYMENT' || flowType === 'INTERNAL_TRANSFER' || flowType === 'CASH_WITHDRAWAL') {
      debtOrTransfers.push(f);
      continue;
    }

    // Check physical rules
    let physicalRule = null;
    for (const r of SA_MERCHANT_RULES) {
      if (r.pattern.test(combined)) {
        physicalRule = r;
        break;
      }
    }
    if (physicalRule) {
      matchedPhysical.push({ flow: f, rule: physicalRule.cleanMerchant });
      continue;
    }

    // Check digital rules
    let digitalRule = null;
    for (const d of DIGITAL_SERVICE_PATTERNS) {
      if (d.pattern.test(combined)) {
        digitalRule = d;
        break;
      }
    }
    if (digitalRule) {
      matchedDigital.push({ flow: f, rule: digitalRule.serviceName });
      continue;
    }

    // Unmatched Outflow!
    unmatchedOutflows.push({
      id: f.id,
      amount,
      destinationRef: rawDest,
      sourceRef: rawSrc,
      flowType,
      createdAt: f.createdAt
    });
  }

  console.log('\\n=== AUDIT CLASSIFICATION RESULTS ===');
  console.log('Matched Physical Store Transactions:', matchedPhysical.length);
  console.log('Matched Digital / Utility Transactions:', matchedDigital.length);
  console.log('Debt / Transfer / Inflow Transactions:', debtOrTransfers.length + incomeFlows.length);
  console.log('UNMATCHED Outflows:', unmatchedOutflows.length);

  // Group unmatched by destinationRef to see top unclassified merchants
  const unmatchedGroups = {};
  for (const u of unmatchedOutflows) {
    const key = u.destinationRef || 'NO_DEST';
    if (!unmatchedGroups[key]) {
      unmatchedGroups[key] = { count: 0, totalAmount: 0, samples: [] };
    }
    unmatchedGroups[key].count++;
    unmatchedGroups[key].totalAmount += u.amount;
    if (unmatchedGroups[key].samples.length < 2) {
      unmatchedGroups[key].samples.push(u);
    }
  }

  const sortedUnmatched = Object.entries(unmatchedGroups).sort((a, b) => b[1].totalAmount - a[1].totalAmount);

  console.log('\\n=== TOP UNMATCHED MERCHANT DESTINATIONS (BY TOTAL AMOUNT) ===');
  for (const [merchant, data] of sortedUnmatched.slice(0, 30)) {
    console.log(`- "${merchant}": R ${data.totalAmount.toFixed(2)} (${data.count} txs)`);
  }

  await prisma.$disconnect();
}

audit().catch(console.error);
"""

with open("temp_audit_unmatched.js", "w") as f:
    f.write(script)

full_cmd = ['scp', '-i', pem_key, '-o', 'StrictHostKeyChecking=no', 'temp_audit_unmatched.js', f"{ec2_host}:/home/ubuntu/moneymanager/temp_audit_unmatched.js"]
subprocess.run(full_cmd)

print(run_ssh("sudo docker cp /home/ubuntu/moneymanager/temp_audit_unmatched.js moneymanager-web:/app/temp_audit_unmatched.js && sudo docker exec moneymanager-web node /app/temp_audit_unmatched.js"))
