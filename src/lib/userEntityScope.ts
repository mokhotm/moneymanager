import { prisma } from "@/lib/prisma";

export interface UserEntityScope {
  userId: string;
  userProfileId?: string;
  accountIds: string[];
  debtIds: string[];
  incomeIds: string[];
  assetIds: string[];
  documentIds: string[];
  incomeEventIds: string[];
  allEntityIds: string[];
  accountMap: Map<string, { id: string; name: string; institution: string; accountNumberMasked?: string | null }>;
  debtMap: Map<string, { id: string; account: { name: string; institution: string; accountNumberMasked?: string | null } }>;
  incomeMap: Map<string, { id: string; sourceName: string }>;
  assetMap: Map<string, { id: string; name: string; type: string }>;
}

/**
 * Resolves all entity IDs and lookup maps owned by the specified user.
 * Guarantees strict multi-tenant isolation across documents, money flows, reports, and agent recommendations.
 */
export async function getUserEntityScope(userId: string): Promise<UserEntityScope> {
  const [profile, accounts, incomes, assets, debts] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true },
    }).catch(() => null),
    prisma.account.findMany({
      where: { userId },
      select: { id: true, name: true, institution: true, accountNumberMasked: true },
    }),
    prisma.income.findMany({
      where: { userId },
      select: { id: true, sourceName: true },
    }),
    prisma.asset.findMany({
      where: { userId },
      select: { id: true, name: true, type: true },
    }),
    prisma.debt.findMany({
      where: { account: { userId } },
      include: { account: { select: { name: true, institution: true, accountNumberMasked: true } } },
    }),
  ]);

  const accountIds = accounts.map((a) => a.id);
  const incomeIds = incomes.map((i) => i.id);
  const assetIds = assets.map((a) => a.id);
  const debtIds = debts.map((d) => d.id);
  const allEntityIds = [...accountIds, ...incomeIds, ...assetIds, ...debtIds];

  const [documents, incomeEvents] = await Promise.all([
    allEntityIds.length > 0
      ? prisma.document.findMany({
          where: { relatedEntityId: { in: allEntityIds } },
          select: { id: true },
        }).catch(() => [])
      : [],
    incomeIds.length > 0
      ? prisma.incomeEvent.findMany({
          where: { incomeId: { in: incomeIds } },
          select: { id: true },
        }).catch(() => [])
      : [],
  ]);

  const documentIds = documents.map((d) => d.id);
  const incomeEventIds = incomeEvents.map((e) => e.id);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const debtMap = new Map(debts.map((d) => [d.id, d]));
  const incomeMap = new Map(incomes.map((i) => [i.id, i]));
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  return {
    userId,
    userProfileId: profile?.id,
    accountIds,
    debtIds,
    incomeIds,
    assetIds,
    documentIds,
    incomeEventIds,
    allEntityIds,
    accountMap,
    debtMap,
    incomeMap,
    assetMap,
  };
}

/**
 * Checks if a given entity ID belongs to the user scope.
 */
export function isEntityOwnedByUser(entityId: string | null | undefined, scope: UserEntityScope): boolean {
  if (!entityId) return false;
  return scope.allEntityIds.includes(entityId);
}

/**
 * Validates if an agent recommendation payload belongs to the authenticated user.
 */
export function isRecommendationOwnedByUser(payload: any, scope: UserEntityScope): boolean {
  if (!payload || typeof payload !== "object") return false;

  // Direct user association
  if (payload.userId && payload.userId === scope.userId) return true;
  if (payload.userProfileId && scope.userProfileId && payload.userProfileId === scope.userProfileId) return true;

  // Income association
  if (payload.incomeId && scope.incomeIds.includes(payload.incomeId)) return true;
  if (payload.incomeEventId && scope.incomeEventIds.includes(payload.incomeEventId)) return true;

  // Debt & Account association
  if (payload.debtId && scope.debtIds.includes(payload.debtId)) return true;
  if (payload.sourceDebtId && (scope.debtIds.includes(payload.sourceDebtId) || scope.accountIds.includes(payload.sourceDebtId))) return true;
  if (payload.targetDebtId && (scope.debtIds.includes(payload.targetDebtId) || scope.accountIds.includes(payload.targetDebtId))) return true;
  if (payload.accountId && scope.accountIds.includes(payload.accountId)) return true;

  // Document association
  if (payload.documentId && scope.documentIds.includes(payload.documentId)) return true;

  return false;
}
