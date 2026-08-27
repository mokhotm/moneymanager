import { prisma } from "../lib/prisma";
import {
  detectEnvironmentLLMs,
  encryptApiKey,
  decryptApiKey,
  validateLLMKey,
  isVisionSupported,
  LLMProviderType,
} from "../agents/llmProvider";

export interface SyncResult {
  syncedCount: number;
  assignedCount: number;
  providers: string[];
}

/**
 * Synchronize all environment-defined LLM keys into the Database Multi-LLM Vault.
 * Preserves existing user-added configurations and ensures agent model assignments are active.
 */
export async function syncEnvironmentLLMsToDatabase(): Promise<SyncResult> {
  const envLLMs = detectEnvironmentLLMs();
  const syncedProviders: string[] = [];
  let syncedCount = 0;
  let assignedCount = 0;

  // 1. Process environment LLMs
  for (const envLLM of envLLMs) {
    const existing = await prisma.lLMProviderConfig.findFirst({
      where: {
        provider: envLLM.provider,
        modelName: envLLM.modelName,
      },
    });

    const encrypted = encryptApiKey(envLLM.apiKey);
    const supportsVision = isVisionSupported(envLLM.provider, envLLM.modelName);

    if (existing) {
      // Check if existing key was a demo/masked key or decrypt failed
      const existingPlain = decryptApiKey(existing.apiKeyEncrypted);
      if (existingPlain.includes("demo-key-masked") || existingPlain === "__DECRYPT_FAILED__" || existingPlain !== envLLM.apiKey) {
        await prisma.lLMProviderConfig.update({
          where: { id: existing.id },
          data: {
            apiKeyEncrypted: encrypted,
            baseUrl: envLLM.baseUrl,
            displayName: envLLM.displayName,
            supportsVision,
            status: "ACTIVE",
            lastValidatedAt: new Date(),
          },
        });
        syncedCount++;
        syncedProviders.push(`${envLLM.provider} (${envLLM.modelName})`);
      }
    } else {
      await prisma.lLMProviderConfig.create({
        data: {
          provider: envLLM.provider,
          displayName: envLLM.displayName,
          apiKeyEncrypted: encrypted,
          baseUrl: envLLM.baseUrl,
          modelName: envLLM.modelName,
          supportsVision,
          status: "ACTIVE",
          lastValidatedAt: new Date(),
        },
      });
      syncedCount++;
      syncedProviders.push(`${envLLM.provider} (${envLLM.modelName})`);
    }
  }

  // 2. Ensure starter configs exist for Google, Anthropic, and OpenAI if nothing is configured
  const totalConfigs = await prisma.lLMProviderConfig.count();
  if (totalConfigs === 0) {
    // Seed Google Gemini starter
    const gemini = await prisma.lLMProviderConfig.create({
      data: {
        provider: "GOOGLE",
        displayName: "Google Gemini 3.7 Flash (Frontier)",
        apiKeyEncrypted: encryptApiKey("AIzaSy-placeholder-key"),
        modelName: "gemini-3.7-flash",
        supportsVision: true,
        status: "UNVERIFIED",
        lastValidatedAt: new Date(),
      },
    });

    // Seed Anthropic starter
    const claude = await prisma.lLMProviderConfig.create({
      data: {
        provider: "ANTHROPIC",
        displayName: "Anthropic Claude 3.7 Sonnet",
        apiKeyEncrypted: encryptApiKey("sk-ant-placeholder-key"),
        modelName: "claude-3-7-sonnet-20250219",
        supportsVision: true,
        status: "UNVERIFIED",
        lastValidatedAt: new Date(),
      },
    });

    // Seed OpenAI starter
    const openai = await prisma.lLMProviderConfig.create({
      data: {
        provider: "OPENAI",
        displayName: "OpenAI GPT-4o Flagship",
        apiKeyEncrypted: encryptApiKey("sk-proj-placeholder-key"),
        modelName: "gpt-4o",
        supportsVision: true,
        status: "UNVERIFIED",
        lastValidatedAt: new Date(),
      },
    });

    // Default assignments
    const defaultAgentConfigId = gemini.id;
    for (const agent of ["DOCUMENT_AGENT", "BUDGET_AGENT", "DEBT_AGENT", "GOALS_AGENT"] as const) {
      await prisma.agentModelAssignment.upsert({
        where: { agent },
        update: { llmProviderConfigId: defaultAgentConfigId },
        create: { agent, llmProviderConfigId: defaultAgentConfigId, isDefault: true },
      });
      assignedCount++;
    }
  } else {
    // 3. Connect agents to the best available ACTIVE provider
    const bestActiveConfig = await prisma.lLMProviderConfig.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    });

    if (bestActiveConfig) {
      for (const agent of ["DOCUMENT_AGENT", "BUDGET_AGENT", "DEBT_AGENT", "GOALS_AGENT"] as const) {
        const existingAssignment = await prisma.agentModelAssignment.findUnique({
          where: { agent },
          include: { llmProviderConfig: true },
        });

        // If no assignment or assigned config is not ACTIVE, reassign to active config
        if (!existingAssignment || existingAssignment.llmProviderConfig?.status !== "ACTIVE") {
          await prisma.agentModelAssignment.upsert({
            where: { agent },
            update: { llmProviderConfigId: bestActiveConfig.id },
            create: { agent, llmProviderConfigId: bestActiveConfig.id, isDefault: true },
          });
          assignedCount++;
        }
      }
    }
  }

  return {
    syncedCount,
    assignedCount,
    providers: syncedProviders,
  };
}
