const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAugustDocuments() {
  console.log("=== SEEDING AUGUST 2026 (20260819) DOCUMENTS INTO DB ===");

  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  if (!user) {
    console.error("User mokhotm not found");
    return;
  }

  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  const accMap = new Map(accounts.map(a => [a.name, a.id]));

  const prestigeId = accMap.get("Prestige Current Account");
  const mymoId = accMap.get("MyMo Current Account");
  const titaniumId = accMap.get("Titanium Prestige Credit Card");
  const bondId = accMap.get("Standard Bank Home Loan (Mortgage Bond)");
  const rcpId = accMap.get("Revolving Credit Plan Loan");

  const augustDocs = [
    {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: prestigeId,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260819/XXXX4469.pdf",
      periodStart: new Date("2026-05-21"),
      periodEnd: new Date("2026-08-19"),
      parsed: true,
      parseStatus: "APPLIED",
    },
    {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: mymoId,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260819/XXXX6506.pdf",
      periodStart: new Date("2026-07-13"),
      periodEnd: new Date("2026-08-19"),
      parsed: true,
      parseStatus: "APPLIED",
    },
    {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: titaniumId,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260819/XXXXX5510.pdf",
      periodStart: new Date("2026-05-21"),
      periodEnd: new Date("2026-08-19"),
      parsed: true,
      parseStatus: "APPLIED",
    },
    {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: bondId,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260819/XXXXXXXXXXXX3529.pdf",
      periodStart: new Date("2026-05-21"),
      periodEnd: new Date("2026-08-19"),
      parsed: true,
      parseStatus: "APPLIED",
    },
    {
      relatedEntityType: "ACCOUNT",
      relatedEntityId: rcpId,
      documentType: "BANK_STATEMENT",
      fileUrl: "Artifacts/StandardBank/20260819/XXXX7592.pdf",
      periodStart: new Date("2026-05-21"),
      periodEnd: new Date("2026-08-19"),
      parsed: true,
      parseStatus: "APPLIED",
    },
  ];

  for (const docData of augustDocs) {
    if (!docData.relatedEntityId) {
      console.warn(`Skipping doc ${docData.fileUrl} - relatedEntityId not found`);
      continue;
    }

    const existing = await prisma.document.findFirst({
      where: { fileUrl: docData.fileUrl }
    });

    if (!existing) {
      const created = await prisma.document.create({
        data: {
          ...docData,
          parsedData: {
            isLiveBankSync: false,
            source: "STATEMENT_UPLOAD",
            statementDate: "2026-08-19",
          }
        }
      });
      console.log(`+ Created document: ${docData.fileUrl} (${created.id})`);
    } else {
      console.log(`= Existing document: ${docData.fileUrl} (${existing.id})`);
    }
  }

  const total = await prisma.document.count();
  console.log(`\nTotal Documents in Database: ${total}`);
}

seedAugustDocuments().then(() => prisma.$disconnect()).catch(console.error);
