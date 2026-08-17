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
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Sunday

  // Direct match
  const directMatch = SA_PUBLIC_HOLIDAYS.some((h) => h.month === month && h.day === day);
  if (directMatch) return true;

  // Monday holiday check (if Sunday was a holiday)
  if (dayOfWeek === 1) {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yMonth = yesterday.getMonth() + 1;
    const yDay = yesterday.getDate();
    const sundayWasHoliday = SA_PUBLIC_HOLIDAYS.some((h) => h.month === yMonth && h.day === yDay);
    if (sundayWasHoliday) return true;
  }

  return false;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if a date is a non-business day (Weekend or SA Public Holiday)
 */
export function isNonBusinessDay(date: Date): boolean {
  return isWeekend(date) || isSAPublicHoliday(date);
}

/**
 * Adjusts a target pay date for weekends and public holidays according to the Preceding Business Day rule (default in SA payroll).
 */
export function adjustPayDateForBusinessDays(
  targetDate: Date,
  rule: "PRECEDING_BUSINESS_DAY" | "FOLLOWING_BUSINESS_DAY" = "PRECEDING_BUSINESS_DAY"
): { actualPayDate: Date; wasShifted: boolean; shiftReason?: string } {
  const current = new Date(targetDate);
  let shifted = false;
  let reason = "";

  if (!isNonBusinessDay(current)) {
    return { actualPayDate: current, wasShifted: false };
  }

  shifted = true;

  if (isWeekend(current)) {
    const dayName = current.getDay() === 6 ? "Saturday" : "Sunday";
    reason = `Target pay date fell on ${dayName}`;
  } else if (isSAPublicHoliday(current)) {
    reason = `Target pay date fell on a public holiday`;
  }

  const step = rule === "PRECEDING_BUSINESS_DAY" ? -1 : 1;

  while (isNonBusinessDay(current)) {
    current.setDate(current.getDate() + step);
  }

  return {
    actualPayDate: current,
    wasShifted: shifted,
    shiftReason: reason ? `${reason}; shifted to ${current.toLocaleDateString("en-ZA", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}` : undefined,
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
  /** "YYYY-MM" of the cycle's start date — use this as the BudgetLineItem month key */
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
      return new Date(year, month, day);
    }
    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const ymdMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month, day);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
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
      formattedRange: `${start.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`,
      cycleMonthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    };
  }

  if (mode === "CALENDAR_MONTH") {
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    return {
      mode: "CALENDAR_MONTH",
      startDate: start,
      endDate: end,
      payDate: targetDate,
      actualPayDate: targetDate,
      wasShifted: false,
      formattedRange: `1 ${start.toLocaleDateString("en-ZA", { month: "short" })} – ${end.getDate()} ${end.toLocaleDateString("en-ZA", { month: "short", year: "numeric" })}`,
      cycleMonthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    };
  }

  // PAYSLIP_AUTO mode
  const { actualPayDate, wasShifted, shiftReason } = adjustPayDateForBusinessDays(targetDate, "PRECEDING_BUSINESS_DAY");

  const start = new Date(actualPayDate);
  start.setHours(0, 0, 0, 0);

  // End date is 1 month minus 1 day from actual pay date
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);

  return {
    mode: "PAYSLIP_AUTO",
    startDate: start,
    endDate: end,
    payDate: targetDate,
    actualPayDate,
    wasShifted,
    shiftReason,
    formattedRange: `${start.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}`,
    cycleMonthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}
