import { prisma } from "@/lib/prisma";

export type TierName = "STARTER_FREE" | "PRO_WEALTH" | "EXECUTIVE_ENTERPRISE";

export interface TierLimits {
  tier: TierName;
  displayName: string;
  priceZar: number;
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
    displayName: "Starter Free",
    priceZar: 0,
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
    displayName: "Pro Wealth Accelerator",
    priceZar: 199,
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
    displayName: "Executive Enterprise",
    priceZar: 499,
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
      username: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      billingCycle: true,
      subscriptionExpiresAt: true,
    },
  });

  if (!user) return null;

  const tier = (user.subscriptionTier as TierName) || "STARTER_FREE";
  const specs = TIER_SPECIFICATIONS[tier] || TIER_SPECIFICATIONS.STARTER_FREE;

  const [accountsCount, debtsCount] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.debt.count({ where: { account: { userId } } }),
  ]);

  const canAddAccount = accountsCount < specs.maxAccounts;
  const canAddDebt = debtsCount < specs.maxDebts;

  return {
    ...user,
    tier,
    specs,
    usage: {
      accountsCount,
      maxAccounts: specs.maxAccounts === Infinity ? "UNLIMITED" : specs.maxAccounts,
      canAddAccount,
      debtsCount,
      maxDebts: specs.maxDebts === Infinity ? "UNLIMITED" : specs.maxDebts,
      canAddDebt,
    },
    featureAccess: {
      dualTrackWaterfall: specs.dualTrackWaterfall,
      spendingLocationRadar: specs.spendingLocationRadar,
      byokLLM: specs.byokLLM,
      multiAgentOCR: specs.multiAgentOCR,
      windeedValuations: specs.windeedValuations,
    },
  };
}

export async function checkFeatureAccess(userId: string, feature: keyof TierLimits) {
  const details = await getUserSubscriptionDetails(userId);
  if (!details) {
    return { allowed: false, error: "User not found", requiredTier: "STARTER_FREE" as TierName };
  }

  const allowed = Boolean(details.featureAccess[feature as keyof typeof details.featureAccess]);

  let requiredTier: TierName = "PRO_WEALTH";
  if (feature === "windeedValuations") requiredTier = "EXECUTIVE_ENTERPRISE";

  return {
    allowed,
    tier: details.tier,
    requiredTier,
    message: allowed
      ? `Feature ${feature} is active for ${details.tier}`
      : `Feature ${feature} requires ${requiredTier} tier. Upgrade on your profile page.`,
  };
}
