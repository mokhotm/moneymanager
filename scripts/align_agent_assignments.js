const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function alignAgentAssignments() {
  const geminiConfig = await prisma.lLMProviderConfig.findFirst({
    where: { provider: "GOOGLE" }
  });

  if (!geminiConfig) {
    console.error("No Google Gemini config found");
    return;
  }

  console.log("Assigning all agents to Google Gemini config:", geminiConfig.id);

  const agents = ["DOCUMENT_AGENT", "BUDGET_AGENT", "DEBT_AGENT", "GOALS_AGENT", "CHAT_AGENT"];
  for (const agent of agents) {
    await prisma.agentModelAssignment.upsert({
      where: { agent },
      update: { llmProviderConfigId: geminiConfig.id },
      create: { agent, llmProviderConfigId: geminiConfig.id },
    });
    console.log(`- Assigned ${agent} -> Google Gemini`);
  }

  console.log("Done aligning agent model assignments.");
}

alignAgentAssignments()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
