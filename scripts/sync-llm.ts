import { syncEnvironmentLLMsToDatabase } from "../src/services/llmSyncService";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔄 Synchronizing environment LLM keys to PostgreSQL vault...");
  const result = await syncEnvironmentLLMsToDatabase();
  console.log("✅ Synced providers:", result.providers);
  console.log(`📊 Total Synced: ${result.syncedCount}, Total Agent Assignments Updated: ${result.assignedCount}`);
}

main()
  .catch((err) => {
    console.error("❌ LLM Sync failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
