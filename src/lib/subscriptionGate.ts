import { prisma } from "@/lib/prisma";

export type TierName = "STARTER_FREE" | "PRO_WEALTH" | "EXECUTIVE_ENTERPRISE";

export interface TierLimits {
  tier: TierName;
  displayName: string;
  priceZar: number;
  priceAnnualZar: number;
  maxAccounts: number;
  maxDebts: number;
  dualTrackWaterfall: boolean;
  spendingLocationRadar: boolean;
  byokLLM: boolean;
  multiAgentOCR: boolean;
  windeedValuations: boolean;
  moneyJourney: boolean;
  coach: boolean;
  reportsDepth: "basic" | "standard" | "advanced";
  aiInsights: "limited" | "full" | "unlimited";
  agentAssignments: number;
  prioritySupport: boolean;
}

export const TIER_SPECIFICATIONS: Record<TierName, TierLimits> = {
  STARTER_FREE: {
    tier: "STARTER_FREE",
    displayName: "Starter Free",
    priceZar: 0,
    priceAnnualZar: 0,
    maxAccounts: 3,
    maxDebts: 5,
    dualTrackWaterfall: false,
    spendingLocationRadar: false,
    byokLLM: false,
    multiAgentOCR: false,
    windeedValuations: false,
    moneyJourney: false,
    coach: false,
    reportsDepth: "basic",
    aiInsights: "limited",
    agentAssignments: 1,
    prioritySupport: false,
  },
  PRO_WEALTH: {
    tier: "PRO_WEALTH",
    displayName: "Pro Wealth Accelerator",
    priceZar: 199,
    priceAnnualZar: 1990,
    maxAccounts: Infinity,
    maxDebts: Infinity,
    dualTrackWaterfall: true,
    spendingLocationRadar: true,
    byokLLM: true,
    multiAgentOCR: true,
    windeedValuations: false,
    moneyJourney: true,
    coach: true,
    reportsDepth: "standard",
    aiInsights: "full",
    agentAssignments: 2,
    prioritySupport: false,
  },
  EXECUTIVE_ENTERPRISE: {
    tier: "EXECUTIVE_ENTERPRISE",
    displayName: "Executive Enterprise",
    priceZar: 499,
    priceAnnualZar: 4990,
    maxAccounts: Infinity,
    maxDebts: Infinity,
    dualTrackWaterfall: true,
    spendingLocationRadar: true,
    byokLLM: true,
    multiAgentOCR: true,
    windeedValuations: true,
    moneyJourney: true,
    coach: true,
    reportsDepth: "advanced",
    aiInsights: "unlimited",
    agentAssignments: 4,
    prioritySupport: true,
  },
};

function normalizeTierName(name?: string | null): TierName {
  if (!name) return "STARTER_FREE";
  const upper = name.toUpperCase();
  if (upper.includes("EXECUTIVE") || upper.includes("ENTERPRISE")) return "EXECUTIVE_ENTERPRISE";
  if (upper.includes("PRO") || upper.includes("WEALTH") || upper.includes("PLUS") || upper.includes("PREMIUM")) {
    return "PRO_WEALTH";
  }
  return "STARTER_FREE";
}

export async function getUserSubscriptionDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      profile: {
        include: {
          userSubscription: {
            include: {
              tier: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Resolve dynamic tier
  let resolvedTier: TierName = "STARTER_FREE";

  const sub = user.profile?.userSubscription;
  const isActiveSub = sub && (sub.status === "ACTIVE" || sub.status === "TRIALING" || sub.status === "PAST_DUE");

  if (isActiveSub && sub.tier?.name) {
    resolvedTier = normalizeTierName(sub.tier.name);
  } else if (user.profile?.subscriptionTierId) {
    const tierRecord = await prisma.subscriptionTier.findUnique({
      where: { id: user.profile.subscriptionTierId },
    });
    if (tierRecord?.name) {
      resolvedTier = normalizeTierName(tierRecord.name);
    }
  } else if (user.role === "admin") {
    // Retain Executive privileges for system admin account
    resolvedTier = "EXECUTIVE_ENTERPRISE";
  }

  const specs = TIER_SPECIFICATIONS[resolvedTier] || TIER_SPECIFICATIONS.STARTER_FREE;

  const [accountsCount, debtsCount] = await Promise.all([
    prisma.account.count({ where: { userId } }),
    prisma.debt.count({ where: { account: { userId } } }),
  ]);

  const canAddAccount = specs.maxAccounts === Infinity || accountsCount < specs.maxAccounts;
  const canAddDebt = specs.maxDebts === Infinity || debtsCount < specs.maxDebts;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    tier: resolvedTier,
    specs,
    subscriptionStatus: sub?.status || (resolvedTier !== "STARTER_FREE" ? "ACTIVE" : "FREE"),
    currentPeriodEnd: sub?.currentPeriodEnd || null,
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
      moneyJourney: specs.moneyJourney,
      coach: specs.coach,
      reportsDepth: specs.reportsDepth,
      aiInsights: specs.aiInsights,
      agentAssignments: specs.agentAssignments,
      prioritySupport: specs.prioritySupport,
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
      : `Feature ${feature} requires ${requiredTier} tier. Upgrade on your subscription page.`,
  };
}
