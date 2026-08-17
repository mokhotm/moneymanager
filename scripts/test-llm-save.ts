import { PrismaClient } from "@prisma/client";
import { encryptApiKey, validateLLMKey } from "../src/agents/llmProvider";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking active LLM keys for mokhotm...");
  const configs = await prisma.lLMProviderConfig.findMany();
  console.log("Current count:", configs.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
