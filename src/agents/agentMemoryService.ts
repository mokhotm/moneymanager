/**
 * Continuous Multi-Agent Learning & Feedback Service
 * Powers agent memory persistence, user correction capture, few-shot prompt injection,
 * and adaptive financial reasoning across all 4 agents.
 */

import { prisma } from "@/lib/prisma";

export type MemoryDomain = "GEO" | "DEBT" | "BUDGET" | "GOALS" | "DOCUMENT" | "PREFERENCE";

export type MemorySource = "USER_CORRECTION" | "PIN_CALIBRATION" | "AI_REFLECTION" | "SYSTEM_AUDIT" | "USER_FEEDBACK";

export interface AgentMemoryDTO {
  id: string;
  domain: MemoryDomain;
  key: string;
  learnedPattern: string;
  resolvedValue: any;
  confidence: number;
  source: MemorySource;
  usageCount: number;
  lastUsedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Record or reinforce a learned pattern into the agent's long-term memory.
 */
export async function recordAgentMemory(params: {
  userId: string;
  domain: MemoryDomain;
  key: string;
  learnedPattern: string;
  resolvedValue: any;
  confidence?: number;
  source?: MemorySource;
}): Promise<AgentMemoryDTO> {
  const {
    userId,
    domain,
    key,
    learnedPattern,
    resolvedValue,
    confidence = 1.0,
    source = "USER_CORRECTION",
  } = params;

  const normalizedKey = key.trim().toUpperCase();

  const memory = await prisma.userAgentMemory.upsert({
    where: {
      userId_domain_key: {
        userId,
        domain,
        key: normalizedKey,
      },
    },
    update: {
      learnedPattern,
      resolvedValue: resolvedValue as any,
      confidence,
      source,
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
    create: {
      userId,
      domain,
      key: normalizedKey,
      learnedPattern,
      resolvedValue: resolvedValue as any,
      confidence,
      source,
      usageCount: 1,
      lastUsedAt: new Date(),
    },
  });

  return {
    ...memory,
    domain: memory.domain as MemoryDomain,
    source: memory.source as MemorySource,
    lastUsedAt: memory.lastUsedAt.toISOString(),
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
  };
}

/**
 * Retrieve all learned memories for a user, optionally filtered by domain.
 */
export async function getUserAgentMemories(
  userId: string,
  domain?: MemoryDomain
): Promise<AgentMemoryDTO[]> {
  const where: any = { userId };
  if (domain) where.domain = domain;

  const memories = await prisma.userAgentMemory.findMany({
    where,
    orderBy: [{ usageCount: "desc" }, { updatedAt: "desc" }],
  });

  return memories.map((m) => ({
    ...m,
    domain: m.domain as MemoryDomain,
    source: m.source as MemorySource,
    lastUsedAt: m.lastUsedAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));
}

/**
 * Ingests learned memories dynamically into System Prompts for LLM Agents.
 */
export async function getPromptAugmentationMemories(
  userId: string,
  domains: MemoryDomain[] = ["GEO", "DEBT", "BUDGET", "GOALS", "PREFERENCE"],
  limit = 15
): Promise<string> {
  try {
    const memories = await prisma.userAgentMemory.findMany({
      where: {
        userId,
        domain: { in: domains },
      },
      orderBy: [{ confidence: "desc" }, { usageCount: "desc" }],
      take: limit,
    });

    if (!memories || memories.length === 0) return "";

    const lines = memories.map((m, idx) => {
      let resolvedStr = "";
      try {
        if (typeof m.resolvedValue === "string") {
          resolvedStr = m.resolvedValue;
        } else if (m.resolvedValue && typeof m.resolvedValue === "object") {
          const v: any = m.resolvedValue;
          resolvedStr = v.cleanMerchant || v.summary || v.locationName || JSON.stringify(v);
        }
      } catch {
        resolvedStr = JSON.stringify(m.resolvedValue);
      }
      return `${idx + 1}. [${m.domain}] Pattern: "${m.key}" -> Correct Interpretation: ${m.learnedPattern} (${resolvedStr}) [Source: ${m.source}]`;
    });

    return `\n### 🧠 Continuous Multi-Agent Learned Memories & User Corrections (DO NOT REPEAT OLD MISTAKES):\n${lines.join("\n")}\n`;
  } catch (err) {
    console.warn("Could not retrieve agent memories for prompt augmentation:", err);
    return "";
  }
}
