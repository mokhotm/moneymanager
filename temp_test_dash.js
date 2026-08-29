
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveSpendingLocations } = require('./src/lib/geoResolver');
const fs = require('fs');
const path = require('path');

async function test() {
  const user = await prisma.user.findFirst({ where: { username: 'mokhotm' }, include: { profile: true } });
  console.log('User:', user.username, user.id);

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const debts = await prisma.debt.findMany({ where: { account: { userId: user.id } }, include: { account: true } });
  
  const userAccountIds = new Set(accounts.map((a) => a.id));
  const userDebtIds = new Set(debts.map((d) => d.id));
  const userAccountNames = new Set(accounts.map((a) => a.name));
  const userInstitutionNames = new Set(accounts.map((a) => a.institution));

  const allOrConditions = [];
  if (userAccountIds.size > 0) {
    allOrConditions.push({ sourceRef: { in: Array.from(userAccountIds) } });
    allOrConditions.push({ destinationRef: { in: Array.from(userAccountIds) } });
  }
  if (userDebtIds.size > 0) {
    allOrConditions.push({ sourceRef: { in: Array.from(userDebtIds) } });
    allOrConditions.push({ destinationRef: { in: Array.from(userDebtIds) } });
  }
  if (userAccountNames.size > 0) {
    allOrConditions.push({ sourceRef: { in: Array.from(userAccountNames) } });
    allOrConditions.push({ destinationRef: { in: Array.from(userAccountNames) } });
  }

  const flows = await prisma.moneyFlow.findMany({
    where: { OR: allOrConditions },
    orderBy: { createdAt: 'desc' },
  });
  console.log('Flows retrieved for dashboard:', flows.length);

  let userOverrides = {};
  const overridesPath = path.join(process.cwd(), 'merchant_overrides.json');
  if (fs.existsSync(overridesPath)) {
    try {
      const all = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
      userOverrides = all[user.id] || {};
      console.log('User overrides loaded:', Object.keys(userOverrides).length);
    } catch(e){}
  }

  const intel = resolveSpendingLocations(flows, userOverrides);
  console.log('Physical Locations:', intel.physicalLocations.length);
  console.log('Digital Services:', intel.digitalServices.length);
  console.log('Total Physical Spend:', intel.totalPhysicalSpend);
  console.log('Total Digital Spend:', intel.totalDigitalSpend);

  console.log('\nSample 10 Physical Locations:');
  for (const loc of intel.physicalLocations.slice(0, 10)) {
    console.log(`- ${loc.merchant} | ${loc.locationName} | Lat: ${loc.lat}, Lng: ${loc.lng} | R ${loc.amount} (${loc.transactionCount} txs)`);
    if (loc.recentTransactions && loc.recentTransactions.length > 0) {
      console.log(`    Recent: ${loc.recentTransactions[0].date} - ${loc.recentTransactions[0].description} (R ${loc.recentTransactions[0].amount})`);
    }
  }

  console.log('\nSample 5 Digital Services:');
  for (const dig of intel.digitalServices.slice(0, 5)) {
    console.log(`- ${dig.serviceName} | ${dig.category} | R ${dig.totalAmount} (${dig.transactionCount} txs)`);
  }

  await prisma.$disconnect();
}
test().catch(console.error);
