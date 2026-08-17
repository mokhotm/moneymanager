import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { username: "mokhotm" } });
  console.log("Mokhotm user details:", JSON.stringify(user, null, 2));

  const configs = await prisma.lLMProviderConfig.findMany();
  console.log("Existing LLM configs in DB:", JSON.stringify(configs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
