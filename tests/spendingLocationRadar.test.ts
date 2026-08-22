import { describe, it, expect } from "vitest";
import { resolveSpendingLocations } from "../src/lib/geoResolver";
import { resolveSalaryCycleRange, parseSafeDate } from "../src/lib/payrollCalendar";

describe("Spending Location Radar Pay Cycle & Monthly Filter Engine", () => {
  const mockTransactions = [
    // August 2026 Pay Cycle (14 Aug 2026 - 14 Sep 2026)
    {
      id: "tx-aug-1",
      destinationRef: "SPAR BAKERTON SPRINGS CARD PURCHASE",
      amount: 850.50,
      createdAt: new Date("2026-08-16T10:00:00Z"),
    },
    {
      id: "tx-aug-2",
      destinationRef: "ENGEN BAKERTON SPRINGS CONVENIENCE",
      amount: 600.00,
      createdAt: new Date("2026-08-20T14:30:00Z"),
    },
    {
      id: "tx-aug-3",
      destinationRef: "NETFLIX ZA SUBSCRIPTION",
      amount: 199.00,
      createdAt: new Date("2026-08-18T00:00:00Z"),
    },
    // July 2026 Pay Cycle (15 Jul 2026 - 13 Aug 2026)
    {
      id: "tx-jul-1",
      destinationRef: "SPAR BAKERTON SPRINGS CARD PURCHASE",
      amount: 1200.00,
      createdAt: new Date("2026-07-20T12:00:00Z"),
    },
    {
      id: "tx-jul-2",
      destinationRef: "WOOLWORTHS PRETORIA MENLYN",
      amount: 1450.00,
      createdAt: new Date("2026-07-25T15:00:00Z"),
    },
    {
      id: "tx-jul-3",
      destinationRef: "NETFLIX ZA SUBSCRIPTION",
      amount: 199.00,
      createdAt: new Date("2026-07-18T00:00:00Z"),
    },
    // Early August Calendar Month (1 Aug 2026 - 13 Aug 2026: falls in July pay cycle, but August calendar month)
    {
      id: "tx-early-aug",
      destinationRef: "ENGEN BAKERTON SPRINGS CONVENIENCE",
      amount: 400.00,
      createdAt: new Date("2026-08-05T09:00:00Z"),
    },
  ];

  it("accurately parses and resolves all locations with full transaction histories", () => {
    const resolved = resolveSpendingLocations(mockTransactions);

    expect(resolved.physicalLocations.length).toBeGreaterThanOrEqual(2);
    expect(resolved.digitalServices.length).toBe(1);

    const spar = resolved.physicalLocations.find((l) => l.merchant.includes("SPAR"));
    expect(spar).toBeDefined();
    expect(spar?.recentTransactions.length).toBe(2);
    expect(spar?.totalAmount).toBe(2050.50);

    const netflix = resolved.digitalServices.find((d) => d.serviceName.includes("Netflix"));
    expect(netflix).toBeDefined();
    expect(netflix?.recentTransactions?.length).toBe(2);
    expect(netflix?.totalAmount).toBe(398.00);
  });

  it("filters physical spending and venues accurately for August 2026 Pay Cycle (14 Aug – 14 Sep)", () => {
    const resolved = resolveSpendingLocations(mockTransactions);
    const cycle = resolveSalaryCycleRange("2026-08");
    const startMs = cycle.startDate.getTime();
    const endMs = cycle.endDate.getTime();

    const filteredPhysical = resolved.physicalLocations
      .map((loc) => {
        const matchingTx = (loc.recentTransactions || []).filter((tx) => {
          const t = parseSafeDate(tx.date).getTime();
          return t >= startMs && t <= endMs;
        });

        if (matchingTx.length === 0) return null;
        return {
          ...loc,
          amount: matchingTx.reduce((s, tx) => s + tx.amount, 0),
          transactionCount: matchingTx.length,
          recentTransactions: matchingTx,
        };
      })
      .filter((l) => l !== null);

    // Woolworths Pretoria occurred in July cycle (25 Jul), so it should NOT be in August Pay Cycle
    const woolworths = filteredPhysical.find((l) => l.merchant.includes("Woolworths"));
    expect(woolworths).toBeUndefined();

    // SPAR Bakerton has 1 transaction in August Pay Cycle (850.50)
    const spar = filteredPhysical.find((l) => l.merchant.includes("SPAR"));
    expect(spar).toBeDefined();
    expect(spar?.amount).toBe(850.50);
    expect(spar?.transactionCount).toBe(1);

    // Engen has 1 transaction in August Pay Cycle (600.00, tx on 20 Aug)
    const engen = filteredPhysical.find((l) => l.merchant.includes("Engen"));
    expect(engen).toBeDefined();
    expect(engen?.amount).toBe(600.00);
    expect(engen?.transactionCount).toBe(1);

    const totalAugCycleSpend = filteredPhysical.reduce((s, l) => s + l.amount, 0);
    expect(totalAugCycleSpend).toBe(1450.50);
  });

  it("filters physical spending accurately for Calendar Month mode (August 2026: 1 Aug – 31 Aug)", () => {
    const resolved = resolveSpendingLocations(mockTransactions);
    const targetYear = 2026;
    const targetMonth = 7; // 0-indexed: 7 = August

    const filteredPhysical = resolved.physicalLocations
      .map((loc) => {
        const matchingTx = (loc.recentTransactions || []).filter((tx) => {
          const d = parseSafeDate(tx.date);
          return d.getUTCFullYear() === targetYear && d.getUTCMonth() === targetMonth;
        });

        if (matchingTx.length === 0) return null;
        return {
          ...loc,
          amount: matchingTx.reduce((s, tx) => s + tx.amount, 0),
          transactionCount: matchingTx.length,
          recentTransactions: matchingTx,
        };
      })
      .filter((l) => l !== null);

    // Engen has 2 transactions in calendar August (400 on 5 Aug + 600 on 20 Aug = 1000)
    const engen = filteredPhysical.find((l) => l.merchant.includes("Engen"));
    expect(engen).toBeDefined();
    expect(engen?.amount).toBe(1000.00);
    expect(engen?.transactionCount).toBe(2);

    // SPAR has 1 transaction in calendar August (850.50 on 16 Aug)
    const spar = filteredPhysical.find((l) => l.merchant.includes("SPAR"));
    expect(spar).toBeDefined();
    expect(spar?.amount).toBe(850.50);

    const totalCalAugSpend = filteredPhysical.reduce((s, l) => s + l.amount, 0);
    expect(totalCalAugSpend).toBe(1850.50);
  });

  it("filters digital services accurately by pay cycle", () => {
    const resolved = resolveSpendingLocations(mockTransactions);
    const cycle = resolveSalaryCycleRange("2026-07");
    const startMs = cycle.startDate.getTime();
    const endMs = cycle.endDate.getTime();

    const filteredDigital = resolved.digitalServices
      .map((dig) => {
        const matchingTx = (dig.recentTransactions || []).filter((tx) => {
          const t = parseSafeDate(tx.date).getTime();
          return t >= startMs && t <= endMs;
        });

        if (matchingTx.length === 0) return null;
        return {
          ...dig,
          totalAmount: matchingTx.reduce((s, tx) => s + tx.amount, 0),
          transactionCount: matchingTx.length,
        };
      })
      .filter((d) => d !== null);

    expect(filteredDigital.length).toBe(1);
    expect(filteredDigital[0]?.serviceName).toContain("Netflix");
    expect(filteredDigital[0]?.totalAmount).toBe(199.00);
    expect(filteredDigital[0]?.transactionCount).toBe(1);
  });
});
