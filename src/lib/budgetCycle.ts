/**
 * Shared utility to resolve the active budget cycle month key.
 * Cached in memory (per server lifecycle and user) to avoid a DB query on every API request.
 */

import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/formatters";
import { getPayCycleBounds, parseSafeDate } from "@/lib/payrollCalendar";

const _cachedCycleMap = new Map<string, { key: string; expires: number }>();
const CYCLE_KEY_CACHE_TTL_MS = 60_000;

/**
 * Returns the active budget cycle month key derived from the user's latest parsed payslip.
 * Scoped to the authenticated user to prevent cross-tenant data leaks.
 */
export async function getActiveCycleMonthKey(userId?: string): Promise<string> {
  const cacheKey = userId || "anonymous";
  const now = Date.now();
  const cached = _cachedCycleMap.get(cacheKey);

  if (cached && now < cached.expires) {
    return cached.key;
  }

  try {
    let whereClause: any = { documentType: "PAYSLIP" };

    if (userId) {
      const [accounts, incomes] = await Promise.all([
        prisma.account.findMany({ where: { userId }, select: { id: true } }),
        prisma.income.findMany({ where: { userId }, select: { id: true } }),
      ]);
      const entityIds = [...accounts.map((a) => a.id), ...incomes.map((i) => i.id)];

      if (entityIds.length === 0) {
        return currentMonthKey();
      }
      whereClause.relatedEntityId = { in: entityIds };
    }

    const payslip = await prisma.document.findFirst({
      where: whereClause,
      orderBy: { uploadedAt: "desc" },
      select: { parsedData: true, periodStart: true },
    });

    if (!payslip) {
      return currentMonthKey();
    }

    let targetYear = 2026;
    let targetMonth = 8;
    if (payslip?.periodStart) {
      const d = parseSafeDate(payslip.periodStart);
      targetYear = d.getUTCFullYear();
      targetMonth = d.getUTCMonth() + 1;
    }

    const basePayDate = new Date(Date.UTC(targetYear, targetMonth - 1, 15));
    const cycleMonthKey = getPayCycleBounds(basePayDate, "PAYSLIP_AUTO").cycleMonthKey;

    _cachedCycleMap.set(cacheKey, { key: cycleMonthKey, expires: now + CYCLE_KEY_CACHE_TTL_MS });
    return cycleMonthKey;
  } catch {
    return currentMonthKey();
  }
}
