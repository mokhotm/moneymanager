import { prisma } from "c:/Ezzy/Projects/Money/src/lib/prisma";

async function main() {
  console.log("=== PURGING MOCK / STATEMENT-LINKED BANK CONNECTIONS ===");
  
  // Count existing connections
  const count = await prisma.bankConnection.count();
  console.log(`Found ${count} existing BankConnection record(s).`);

  if (count > 0) {
    const deleted = await prisma.bankConnection.deleteMany({});
    console.log(`Successfully deleted ${deleted.count} synthetic BankConnection record(s).`);
  }

  console.log("All bank connections have been purged. The banking hub now starts with 0 live feeds until authenticated.");
}

main()
  .catch((err) => {
    console.error("Purge error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
