import { describe, it, expect } from "vitest";
import { buildForensicAuditReport, isReversalFlow } from "@/lib/forensicAudit";

describe("Forensic Audit Engine", () => {
  it("correctly identifies return/reversal flows", () => {
    expect(isReversalFlow({ flowType: "INCOME" }, "Prestige Current Account (XXXX4469)")).toBe(true);
    expect(isReversalFlow({ flowType: "CASH_SPENDING" }, "TRACKER RTD-NOT PROVIDED FOR")).toBe(true);
    expect(isReversalFlow({ flowType: "DEBT_PAYMENT" }, "TELKOM RTD-NO AUTHORITY TO DEBIT")).toBe(true);
    expect(isReversalFlow({ flowType: "DEBT_PAYMENT" }, "CARTRACK TRANSACTION REVERSAL")).toBe(true);
    expect(isReversalFlow({ flowType: "DEBT_PAYMENT" }, "Standard Bank Mortgage Paid")).toBe(false);
  });

  it("nets returned debit orders and eliminates double-inflation", () => {
    const mockFlows = [
      {
        id: "flow-1",
        amount: 2000,
        flowType: "DEBT_PAYMENT",
        sourceRef: "Prestige Current Account (XXXX4469)",
        destinationRef: "TELKOM SA BROADBAND 345612241",
        createdAt: new Date("2026-08-15"),
      },
      {
        id: "flow-2",
        amount: 5000,
        flowType: "DEBT_PAYMENT",
        sourceRef: "Prestige Current Account (XXXX4469)",
        destinationRef: "TELKOM DEBICHECK DEBIT ORDER",
        createdAt: new Date("2026-08-14"),
      },
      {
        id: "flow-3",
        amount: 831.53,
        flowType: "DEBT_PAYMENT",
        sourceRef: "Prestige Current Account (XXXX4469)",
        destinationRef: "TELKOMMOBI51062519801195859858 TELEPHONE ACCOUNT",
        createdAt: new Date("2026-07-31"),
      },
      {
        id: "flow-4",
        amount: 831.53,
        flowType: "INCOME",
        sourceRef: "TELKOMMOBI51062519801195859858 RTD-NOT PROVIDED FOR",
        destinationRef: "Prestige Current Account (XXXX4469)",
        createdAt: new Date("2026-07-31"),
      },
    ];

    const report = buildForensicAuditReport(mockFlows, null);
    const telkomItem = report.items.find((i) => i.name.includes("Telkom"));

    expect(telkomItem).toBeDefined();
    expect(telkomItem?.grossDebits).toBe(7831.53);
    expect(telkomItem?.grossReversals).toBe(831.53);
    expect(telkomItem?.netPaid).toBe(7000);
    expect(telkomItem?.auditStatus).toBe("REVERSALS_DETECTED");
  });

  it("deduplicates multi-statement identical billing events on same date", () => {
    const mockFlows = [
      {
        id: "f1",
        amount: 229,
        flowType: "CASH_SPENDING",
        sourceRef: "Titanium Prestige Credit Card",
        destinationRef: "Netflix ZA Cape",
        createdAt: new Date("2026-07-17"),
      },
      {
        id: "f2",
        amount: 229,
        flowType: "CASH_SPENDING",
        sourceRef: "Prestige Current Account",
        destinationRef: "Netflix ZA Cape",
        createdAt: new Date("2026-07-17"),
      },
    ];

    const report = buildForensicAuditReport(mockFlows, null);
    const netflixItem = report.items.find((i) => i.name.includes("Netflix"));

    expect(netflixItem).toBeDefined();
    expect(netflixItem?.transactionCount).toBe(1);
    expect(netflixItem?.duplicateCount).toBe(1);
    expect(netflixItem?.netPaid).toBe(229);
    expect(netflixItem?.auditStatus).toBe("DUPLICATES_REMOVED");
  });
});
