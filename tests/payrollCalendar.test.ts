import { describe, it, expect } from "vitest";
import {
  isSAPublicHoliday,
  isWeekend,
  adjustPayDateForBusinessDays,
  getPayCycleBounds,
} from "../src/lib/payrollCalendar";

describe("Payroll Calendar & Business Day Adjustment Engine", () => {
  it("correctly identifies South African public holidays", () => {
    // Human Rights Day 21 March
    expect(isSAPublicHoliday(new Date(2026, 2, 21))).toBe(true);
    // Freedom Day 27 April
    expect(isSAPublicHoliday(new Date(2026, 3, 27))).toBe(true);
    // Workers Day 1 May
    expect(isSAPublicHoliday(new Date(2026, 4, 1))).toBe(true);
    // Youth Day 16 June
    expect(isSAPublicHoliday(new Date(2026, 5, 16))).toBe(true);
    // Christmas 25 Dec
    expect(isSAPublicHoliday(new Date(2026, 11, 25))).toBe(true);
    // Normal day 15 July
    expect(isSAPublicHoliday(new Date(2026, 6, 15))).toBe(false);
  });

  it("correctly identifies weekends", () => {
    // 15 Aug 2026 is Saturday
    expect(isWeekend(new Date(2026, 7, 15))).toBe(true);
    // 16 Aug 2026 is Sunday
    expect(isWeekend(new Date(2026, 7, 16))).toBe(true);
    // 14 Aug 2026 is Friday
    expect(isWeekend(new Date(2026, 7, 14))).toBe(false);
  });

  it("shifts Saturday pay date to preceding Friday", () => {
    // 15 Aug 2026 is Saturday
    const target = new Date(2026, 7, 15);
    const res = adjustPayDateForBusinessDays(target, "PRECEDING_BUSINESS_DAY");
    expect(res.wasShifted).toBe(true);
    // Should be Friday 14 Aug 2026
    expect(res.actualPayDate.getDate()).toBe(14);
    expect(res.actualPayDate.getMonth()).toBe(7);
  });

  it("shifts Sunday pay date to preceding Friday", () => {
    // 15 Nov 2026 is Sunday
    const target = new Date(2026, 10, 15);
    const res = adjustPayDateForBusinessDays(target, "PRECEDING_BUSINESS_DAY");
    expect(res.wasShifted).toBe(true);
    // Should be Friday 13 Nov 2026
    expect(res.actualPayDate.getDate()).toBe(13);
  });

  it("does not shift normal weekday pay dates", () => {
    // 15 July 2026 is Wednesday
    const target = new Date(2026, 6, 15);
    const res = adjustPayDateForBusinessDays(target, "PRECEDING_BUSINESS_DAY");
    expect(res.wasShifted).toBe(false);
    expect(res.actualPayDate.getDate()).toBe(15);
  });

  it("calculates PAYSLIP_AUTO pay cycle bounds accurately", () => {
    // SARS July 2026 pay date (15 July 2026)
    const bounds = getPayCycleBounds(new Date(2026, 6, 15), "PAYSLIP_AUTO");
    expect(bounds.mode).toBe("PAYSLIP_AUTO");
    expect(bounds.startDate.getDate()).toBe(15);
    expect(bounds.startDate.getMonth()).toBe(6); // July
    expect(bounds.endDate.getDate()).toBe(14);
    expect(bounds.endDate.getMonth()).toBe(7); // August
  });

  it("calculates CALENDAR_MONTH cycle bounds accurately", () => {
    const bounds = getPayCycleBounds(new Date(2026, 6, 15), "CALENDAR_MONTH");
    expect(bounds.mode).toBe("CALENDAR_MONTH");
    expect(bounds.startDate.getDate()).toBe(1);
    expect(bounds.endDate.getDate()).toBe(31);
  });
});
