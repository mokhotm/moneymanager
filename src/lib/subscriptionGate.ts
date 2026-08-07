import { prisma } from "@/lib/prisma";

export type TierName = "STARTER_FREE" | "PRO_WEALTH" | "EXECUTIVE_ENTERPRISE";

export interface TierLimits {
  tier: TierName;
  maxAccounts: number;
  maxDebts: number;
  dualTrackWaterfall: boolean;
  spendingLocationRadar: boolean;
  byokLLM: boolean;
  multiAgentOCR: boolean;
  windeedValuations: boolean;
}

export const TIER_SPECIFICATIONS: Record<TierName, TierLimits> = {
  STARTER_FREE: {
    tier: "STARTER_FREE",
    maxAccounts: 3,
    maxDebts: 5,
    dualTrackWaterfall: false,
    spendingLocationRadar: false,
    byokLLM: false,
    multiAgentOCR: false,
    windeedValuations: false,
  },
  PRO_WEALTH: {
    tier: "PRO_WEALTH",
    maxAccounts: Infinity,
    maxDebts: Infinity,
    dualTrackWaterfall: true,
    spendingLocationRadar: true,
    byokLLM: true,
    multiAgentOCR: true,
    windeedValuations: false,
  },
  EXECUTIVE_ENTERPRISE: {
    tier: "EXECUTIVE_ENTERPRISE",
    maxAccounts: Infinity,
    maxDebts: Infinity,
    dualTrackWaterfall: true,
    spendingLocationRadar: true,
    byokLLM: true,
    multiAgentOCR: true,
    windeedValuations: true,
  },
};

export async function getUserSubscriptionDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      billingCycle: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user) return null;

  const tier = (user.subscriptionTier as TierName) || "STARTER_FREE";
  const specs = TIER_SPECIFICATIONS[tier] || TIER_SPECIFICATIONS.STARTER_FREE;

  return {
    ...user,
    specs,
  };
}
