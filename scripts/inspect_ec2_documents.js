const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectDocuments() {
  console.log("=== INSPECTING ALL DOCUMENTS IN EC2 DATABASE ===");

  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  console.log("User:", user?.id, user?.username);

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  console.log("Accounts owned by mokhotm:", accounts.map(a => `${a.name} (${a.id})`));

  const debts = await prisma.debt.findMany({ where: { account: { userId: user.id } } });
  console.log("Debts owned by mokhotm:", debts.map(d => d.id));

  const allDocs = await prisma.document.findMany();
  console.log(`\nTotal Documents in DB: ${allDocs.length}`);

  for (const doc of allDocs) {
    const isAccountMatch = accounts.some(a => a.id === doc.relatedEntityId);
    const isDebtMatch = debts.some(d => d.id === doc.relatedEntityId);
    const hasTransactions = !!(doc.parsedData && doc.parsedData.transactions);
    const txCount = hasTransactions ? doc.parsedData.transactions.length : 0;
    
    console.log(`- Doc ID: ${doc.id}`);
    console.log(`  Type: ${doc.documentType} | Related: ${doc.relatedEntityType}:${doc.relatedEntityId}`);
    console.log(`  FileUrl: ${doc.fileUrl}`);
    console.log(`  Parsed: ${doc.parsed} | Status: ${doc.parseStatus}`);
    console.log(`  Owned by mokhotm: ${isAccountMatch || isDebtMatch ? 'YES' : 'NO'}`);
    console.log(`  Transactions count in parsedData: ${txCount}`);
  }
}

inspectDocuments().then(() => prisma.$disconnect()).catch(console.error);
