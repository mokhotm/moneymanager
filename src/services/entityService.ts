/**
 * Multi-Entity & Family Office Service (§Vector 2 / 100x Architecture)
 * Resolves entity data from real user records safely.
 */

import { prisma } from "@/lib/prisma";

export type EntityType = "PERSONAL" | "BUSINESS" | "TRUST" | "SPV_PROPERTY";

export interface FinancialEntityInfo {
  id: string;
  name: string;
  type: EntityType;
  registrationNumber?: string;
  taxNumber?: string;
  currency: string;
  isPrimary: boolean;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyRevenue: number;
  accountCount: number;
  badgeColor: string;
  description: string;
}

export const DEFAULT_ENTITIES: FinancialEntityInfo[] = [];

export async function getEntitiesForUser(userId: string): Promise<FinancialEntityInfo[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return [];
    }

    const [accounts, assets, debts, incomes] = await Promise.all([
      prisma.account.findMany({ where: { userId } }).catch(() => []),
      prisma.asset.findMany({ where: { userId } }).catch(() => []),
      prisma.debt.findMany({ where: { account: { userId } } }).catch(() => []),
      prisma.income.findMany({ where: { userId } }).catch(() => []),
    ]);

    const nonDebtAccounts = accounts.filter((a) => !a.isDebt);
    const bankAssets = nonDebtAccounts.reduce((sum, a) => sum + Math.max(0, Number(a.openingBalance || 0)), 0);
    const nonCashAssets = assets.filter((a) => !a.accountId && a.type !== "CASH");
    const tangibleAssets = nonCashAssets.reduce((sum, a) => sum + Number(a.currentValue || 0), 0);
    const totalAssets = bankAssets + tangibleAssets;
    const totalLiabilities = debts.reduce((sum, d) => sum + Number(d.currentBalance || 0), 0);
    const monthlyRevenue = incomes.reduce((sum, i) => sum + Number(i.recurringAmount || 0), 0);

    const displayName = user?.profile?.fullName?.trim() || user?.username || "Personal Wealth";

    return [
      {
        id: `entity-${userId}`,
        name: `${displayName} Personal Wealth`,
        type: "PERSONAL",
        currency: user?.profile?.preferredCurrency || "ZAR",
        isPrimary: true,
        netWorth: totalAssets - totalLiabilities,
        totalAssets,
        totalLiabilities,
        monthlyRevenue,
        accountCount: accounts.length,
        badgeColor: "#38bdf8",
        description: "Consolidated personal entity from linked accounts, debts, assets, and income.",
      },
    ];
  } catch (err) {
    console.error("Error in getEntitiesForUser:", err);
    return [];
  }
}
