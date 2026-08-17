/**
 * Shared utility to resolve the active budget cycle month key.
 * Cached in memory (per server lifecycle) to avoid a DB query on every API request.
 */

import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/formatters";
import { getPayCycleBounds, parseSafeDate } from "@/lib/payrollCalendar";

let _cachedCycleMonthKey: string | undefined;
let _cachedCycleKeyExpiry = 0;

/** Cache duration: 60 seconds — long enough to cover a page load with multiple API calls */
const CYCLE_KEY_CACHE_TTL_MS = 60_000;

/**
 * Returns the active budget cycle month key derived from the latest parsed payslip.
 * Result is cached for 60 seconds to avoid redundant DB queries across concurrent API calls.
 */
export async function getActiveCycleMonthKey(): Promise<string> {
  const now = Date.now();
  if (_cachedCycleMonthKey && now < _cachedCycleKeyExpiry) {
    return _cachedCycleMonthKey;
  }

  try {
    const payslip = await prisma.document.findFirst({
      where: { documentType: "PAYSLIP" },
      orderBy: { uploadedAt: "desc" },
      select: { parsedData: true, periodStart: true },
    });

    let payDate = new Date("2026-08-15");
    if (payslip?.parsedData && (payslip.parsedData as any).mainPayDate) {
      payDate = parseSafeDate((payslip.parsedData as any).mainPayDate);
    } else if (payslip?.periodStart) {
      payDate = parseSafeDate(payslip.periodStart);
      payDate.setDate(15);
    }

    _cachedCycleMonthKey = getPayCycleBounds(payDate, "PAYSLIP_AUTO").cycleMonthKey;
    _cachedCycleKeyExpiry = now + CYCLE_KEY_CACHE_TTL_MS;
    return _cachedCycleMonthKey;
  } catch {
    return currentMonthKey();
  }
}
