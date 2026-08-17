import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspectLLMConfigs() {
  const configs = await prisma.lLMProviderConfig.findMany();
  console.log('=== LLM PROVIDER CONFIGS IN DB === (Total:', configs.length, ')');
  configs.forEach(c => {
    console.log({
      id: c.id,
      provider: c.provider,
      displayName: c.displayName,
      modelName: c.modelName,
      status: c.status,
      apiKeyEncrypted: c.apiKeyEncrypted ? c.apiKeyEncrypted.slice(0, 15) + '...' : null,
      createdAt: c.createdAt,
    });
  });

  const assignments = await prisma.agentModelAssignment.findMany({
    include: { llmProviderConfig: true }
  });
  console.log('\n=== AGENT MODEL ASSIGNMENTS === (Total:', assignments.length, ')');
  assignments.forEach(a => {
    console.log({
      id: a.id,
      agent: a.agent,
      provider: a.llmProviderConfig?.provider,
      modelName: a.llmProviderConfig?.modelName,
      status: a.llmProviderConfig?.status,
    });
  });
}

inspectLLMConfigs().catch(console.error).finally(() => prisma.$disconnect());
