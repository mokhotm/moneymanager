/**
 * South African Statutory Public Holidays Calendar & Payroll Business Day Adjustment Engine
 */

export interface PublicHoliday {
  name: string;
  month: number; // 1-12
  day: number; // 1-31
}

// Fixed South African Public Holidays
export const SA_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Human Rights Day", month: 3, day: 21 },
  { name: "Freedom Day", month: 4, day: 27 },
  { name: "Workers' Day", month: 5, day: 1 },
  { name: "Youth Day", month: 6, day: 16 },
  { name: "National Women's Day", month: 8, day: 9 },
  { name: "Heritage Day", month: 9, day: 24 },
  { name: "Day of Reconciliation", month: 12, day: 16 },
  { name: "Christmas Day", month: 12, day: 25 },
  { name: "Day of Goodwill", month: 12, day: 26 },
];

/**
 * Check if a given date is a South African public holiday.
 * Also accounts for the Public Holidays Act rule: if a public holiday falls on a Sunday, the following Monday is a public holiday.
 */
export function isSAPublicHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dayOfWeek = date.getUTCDay(); // 0 = Sunday

  // Direct match
  const directMatch = SA_PUBLIC_HOLIDAYS.some((h) => h.month === month && h.day === day);
  if (directMatch) return true;

  // Monday holiday check (if Sunday was a holiday)
  if (dayOfWeek === 1) {
    const yesterday = new Date(date);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yMonth = yesterday.getUTCMonth() + 1;
    const yDay = yesterday.getUTCDate();
    const sundayWasHoliday = SA_PUBLIC_HOLIDAYS.some((h) => h.month === yMonth && h.day === yDay);
    if (sundayWasHoliday) return true;
  }

  return false;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a non-business day (Weekend or SA Public Holiday)
 */
export function isNonBusinessDay(date: Date): boolean {
  return isWeekend(date) || isSAPublicHoliday(date);
}

/**
 * Adjusts a target pay date according to South African payroll rules:
 * - Base pay date: 15th of the month.
 * - Saturday -> Friday (Preceding Business Day: day - 1).
 * - Sunday -> Monday (Following Business Day: day + 1).
 * - Public Holiday -> Shift to preceding business day before the holiday (and avoid weekends).
 */
export function adjustPayDateForBusinessDays(
  targetDate: Date,
  rule: "PRECEDING_BUSINESS_DAY" | "FOLLOWING_BUSINESS_DAY" | "SA_STANDARD" = "SA_STANDARD"
): { actualPayDate: Date; wasShifted: boolean; shiftReason?: string } {
  let current = new Date(targetDate);
  const original = new Date(targetDate);

  // If holiday: shift to preceding day first
  while (isSAPublicHoliday(current)) {
    current.setUTCDate(current.getUTCDate() - 1);
  }

  const dow = current.getUTCDay(); // 0 = Sun, 6 = Sat
  if (dow === 6) {
    // Saturday -> Friday
    current.setUTCDate(current.getUTCDate() - 1);
  } else if (dow === 0) {
    // Sunday -> Monday
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // If shifted date lands on a holiday or weekend, walk back to previous business day
  while (isNonBusinessDay(current)) {
    current.setUTCDate(current.getUTCDate() - 1);
  }

  const wasShifted = current.getTime() !== original.getTime();
  let shiftReason: string | undefined;
  if (wasShifted) {
    const origDow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][original.getUTCDay()];
    shiftReason = `Base pay date fell on ${origDow}; shifted to ${current.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}`;
  }

  return {
    actualPayDate: current,
    wasShifted,
    shiftReason,
  };
}

export type BudgetCycleMode = "PAYSLIP_AUTO" | "CALENDAR_MONTH" | "CUSTOM_RANGE";

export interface PayCycleBounds {
  mode: BudgetCycleMode;
  startDate: Date;
  endDate: Date;
  payDate: Date;
  actualPayDate: Date;
  wasShifted: boolean;
  shiftReason?: string;
  formattedRange: string;
  cycleMonthKey: string;
}

/**
 * Parse date strings robustly, correctly handling South African DD.MM.YYYY, DD/MM/YYYY, ISO YYYY-MM-DD, and Date objects.
 */
export function parseSafeDate(input: Date | string | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date && !isNaN(input.getTime())) return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(Date.UTC(year, month, day));
    }
    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const ymdMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(Date.UTC(year, month, day));
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Resolves the exact salary cycle bounds for a given month key (e.g. "2026-08" or "2026-07").
 * Synchronizes with actual detected statement salary dates if provided.
 */
export function resolveSalaryCycleRange(
  monthKey: string,
  detectedStatementDate?: Date | string
): {
  startDate: Date;
  endDate: Date;
  actualPayDate: Date;
  nextPayDate: Date;
  cycleMonthKey: string;
  formattedRange: string;
  dropdownLabel: string;
  wasShifted: boolean;
  shiftReason?: string;
} {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // 1. Compute actual pay date for this cycle month (or use detected statement date)
  let actualPayDate: Date;
  let wasShifted = false;
  let shiftReason: string | undefined;

  if (detectedStatementDate) {
    actualPayDate = parseSafeDate(detectedStatementDate);
  } else {
    const baseTarget = new Date(Date.UTC(year, month - 1, 15));
    const adjusted = adjustPayDateForBusinessDays(baseTarget, "SA_STANDARD");
    actualPayDate = adjusted.actualPayDate;
    wasShifted = adjusted.wasShifted;
    shiftReason = adjusted.shiftReason;
  }

  // 2. Compute next cycle's actual pay date
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear++;
  }
  const nextBaseTarget = new Date(Date.UTC(nextYear, nextMonth - 1, 15));
  const nextPayDate = adjustPayDateForBusinessDays(nextBaseTarget, "SA_STANDARD").actualPayDate;

  // 3. Cycle starts on actualPayDate at 00:00:00 UTC and ends the day before nextPayDate at 23:59:59.999 UTC
  const startDate = new Date(Date.UTC(actualPayDate.getUTCFullYear(), actualPayDate.getUTCMonth(), actualPayDate.getUTCDate(), 0, 0, 0, 0));
  
  const cycleEndDay = new Date(nextPayDate);
  cycleEndDay.setUTCDate(cycleEndDay.getUTCDate() - 1);
  const endDate = new Date(Date.UTC(cycleEndDay.getUTCFullYear(), cycleEndDay.getUTCMonth(), cycleEndDay.getUTCDate(), 23, 59, 59, 999));

  const startDayStr = `${startDate.getUTCDate()} ${startDate.toLocaleString("en-ZA", { month: "short", timeZone: "UTC" })}`;
  const endDayStr = `${cycleEndDay.getUTCDate()} ${cycleEndDay.toLocaleString("en-ZA", { month: "short", timeZone: "UTC" })}`;
  const nextPayStr = `${nextPayDate.getUTCDate()} ${nextPayDate.toLocaleString("en-ZA", { month: "short", timeZone: "UTC" })}`;
  const formattedRange = `${startDayStr} – ${endDayStr}`;

  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-ZA", { month: "long", timeZone: "UTC" });
  const dropdownLabel = `${monthName} ${year} (${startDayStr} - ${nextPayStr})`;

  return {
    startDate,
    endDate,
    actualPayDate,
    nextPayDate,
    cycleMonthKey: monthKey,
    formattedRange,
    dropdownLabel,
    wasShifted,
    shiftReason,
  };
}

/**
 * Calculates exact budget cycle bounds based on mode and pay date.
 */
export function getPayCycleBounds(
  payDateInput: Date | string,
  mode: BudgetCycleMode = "PAYSLIP_AUTO",
  customStartDate?: Date | string,
  customEndDate?: Date | string
): PayCycleBounds {
  const targetDate = parseSafeDate(payDateInput);

  if (mode === "CUSTOM_RANGE" && customStartDate && customEndDate) {
    const start = parseSafeDate(customStartDate);
    const end = parseSafeDate(customEndDate);
    return {
      mode: "CUSTOM_RANGE",
      startDate: start,
      endDate: end,
      payDate: targetDate,
      actualPayDate: targetDate,
      wasShifted: false,
      formattedRange: `${start.toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" })} – ${end.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
      cycleMonthKey: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  }

  if (mode === "CALENDAR_MONTH") {
    const start = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), 1, 0, 0, 0));
    const end = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));
    return {
      mode: "CALENDAR_MONTH",
      startDate: start,
      endDate: end,
      payDate: targetDate,
      actualPayDate: targetDate,
      wasShifted: false,
      formattedRange: `1 ${start.toLocaleDateString("en-ZA", { month: "short", timeZone: "UTC" })} – ${end.getUTCDate()} ${end.toLocaleDateString("en-ZA", { month: "short", year: "numeric", timeZone: "UTC" })}`,
      cycleMonthKey: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    };
  }

  // PAYSLIP_AUTO mode
  const { actualPayDate, wasShifted, shiftReason } = adjustPayDateForBusinessDays(targetDate, "SA_STANDARD");

  const start = new Date(Date.UTC(actualPayDate.getUTCFullYear(), actualPayDate.getUTCMonth(), actualPayDate.getUTCDate(), 0, 0, 0, 0));
  
  // Next cycle pay date
  let nextMonth = actualPayDate.getUTCMonth() + 2;
  let nextYear = actualPayDate.getUTCFullYear();
  if (nextMonth === 13) {
    nextMonth = 1;
    nextYear++;
  }
  const nextTarget = new Date(Date.UTC(nextYear, nextMonth - 1, 15));
  const nextActual = adjustPayDateForBusinessDays(nextTarget, "SA_STANDARD").actualPayDate;
  
  const end = new Date(Date.UTC(nextActual.getUTCFullYear(), nextActual.getUTCMonth(), nextActual.getUTCDate() - 1, 23, 59, 59, 999));

  return {
    mode: "PAYSLIP_AUTO",
    startDate: start,
    endDate: end,
    payDate: targetDate,
    actualPayDate,
    wasShifted,
    shiftReason,
    formattedRange: `${start.toLocaleDateString("en-ZA", { day: "numeric", month: "short", timeZone: "UTC" })} – ${end.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
    cycleMonthKey: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
  };
}
