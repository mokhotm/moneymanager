import { prisma } from "@/lib/prisma";

export interface UserEntityScope {
  userId: string;
  accountIds: string[];
  debtIds: string[];
  incomeIds: string[];
  assetIds: string[];
  allEntityIds: string[];
  accountMap: Map<string, { id: string; name: string; institution: string; accountNumberMasked?: string | null }>;
  debtMap: Map<string, { id: string; account: { name: string; institution: string; accountNumberMasked?: string | null } }>;
  incomeMap: Map<string, { id: string; sourceName: string }>;
  assetMap: Map<string, { id: string; name: string; type: string }>;
}

/**
 * Resolves all entity IDs and lookup maps owned by the specified user.
 * Guarantees strict multi-tenant isolation across documents, money flows, and reports.
 */
export async function getUserEntityScope(userId: string): Promise<UserEntityScope> {
  const [accounts, incomes, assets, debts] = await Promise.all([
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

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const debtMap = new Map(debts.map((d) => [d.id, d]));
  const incomeMap = new Map(incomes.map((i) => [i.id, i]));
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  return {
    userId,
    accountIds,
    debtIds,
    incomeIds,
    assetIds,
    allEntityIds,
    accountMap,
    debtMap,
    incomeMap,
    assetMap,
  };
}

/**
 * Checks if a given entity ID is owned by the user based on the scope.
 */
export function isEntityOwnedByUser(entityId: string | null | undefined, scope: UserEntityScope): boolean {
  if (!entityId) return false;
  return (
    scope.accountMap.has(entityId) ||
    scope.debtMap.has(entityId) ||
    scope.incomeMap.has(entityId) ||
    scope.assetMap.has(entityId)
  );
}
