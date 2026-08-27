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
    if (userId) {
      // Check latest confirmed income date
      const latestIncome = await prisma.income.findFirst({
        where: { userId },
        orderBy: { lastConfirmedDate: "desc" },
        select: { lastConfirmedDate: true },
      });

      if (latestIncome?.lastConfirmedDate) {
        const d = parseSafeDate(latestIncome.lastConfirmedDate);
        const cycleMonthKey = getPayCycleBounds(d, "PAYSLIP_AUTO").cycleMonthKey;
        _cachedCycleMap.set(cacheKey, { key: cycleMonthKey, expires: now + CYCLE_KEY_CACHE_TTL_MS });
        return cycleMonthKey;
      }

      const [accounts, incomes] = await Promise.all([
        prisma.account.findMany({ where: { userId }, select: { id: true } }),
        prisma.income.findMany({ where: { userId }, select: { id: true } }),
      ]);
      const entityIds = [...accounts.map((a) => a.id), ...incomes.map((i) => i.id)];

      if (entityIds.length === 0) {
        return currentMonthKey();
      }

      const latestDoc = await prisma.document.findFirst({
        where: {
          relatedEntityId: { in: entityIds },
          documentType: { in: ["PAYSLIP", "BANK_STATEMENT"] },
        },
        orderBy: [{ periodStart: "desc" }, { uploadedAt: "desc" }],
        select: { periodStart: true, periodEnd: true },
      });

      if (latestDoc?.periodStart || latestDoc?.periodEnd) {
        const d = parseSafeDate(latestDoc.periodEnd || latestDoc.periodStart);
        const cycleMonthKey = getPayCycleBounds(d, "PAYSLIP_AUTO").cycleMonthKey;
        _cachedCycleMap.set(cacheKey, { key: cycleMonthKey, expires: now + CYCLE_KEY_CACHE_TTL_MS });
        return cycleMonthKey;
      }
    }

    return currentMonthKey();
  } catch {
    return currentMonthKey();
  }
}
