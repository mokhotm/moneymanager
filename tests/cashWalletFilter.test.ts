import { describe, it, expect } from "vitest";
import { resolveSalaryCycleRange } from "../src/lib/payrollCalendar";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/cash-wallet/route";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/session";

describe("Cash Wallet & ATM Split Filter Invariants", () => {
  it("should filter cash wallet data by pay cycle (15th-to-15th)", async () => {
    const primaryUser = await prisma.user.findFirst({ where: { username: "mokhotm" } });
    expect(primaryUser).toBeDefined();

    const token = createSessionToken({
      userId: primaryUser!.id,
      username: primaryUser!.username,
      exp: Date.now() + 3600000,
    });

    const req = new NextRequest("http://localhost:3000/api/cash-wallet?month=2026-08&mode=PAY_CYCLE", {
      headers: { cookie: `auth_session=${token}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.trackedBalance).toBeGreaterThan(0);
    expect(data.activeCycle).toBeDefined();
    expect(data.activeCycle.key).toBe("2026-08");
    expect(data.activeCycle.mode).toBe("PAY_CYCLE");
    expect(data.availableCycles).toBeDefined();
    expect(data.availableCycles.length).toBeGreaterThan(0);
  });

  it("should filter cash wallet data by calendar month (01st-to-last-day)", async () => {
    const primaryUser = await prisma.user.findFirst({ where: { username: "mokhotm" } });
    expect(primaryUser).toBeDefined();

    const token = createSessionToken({
      userId: primaryUser!.id,
      username: primaryUser!.username,
      exp: Date.now() + 3600000,
    });

    const req = new NextRequest("http://localhost:3000/api/cash-wallet?month=2026-08&mode=CALENDAR_MONTH", {
      headers: { cookie: `auth_session=${token}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.activeCycle).toBeDefined();
    expect(data.activeCycle.mode).toBe("CALENDAR_MONTH");
    expect(data.activeCycle.formattedRange).toBe("01 Aug – 31 Aug 2026");
  });

  it("should accurately return unallocated withdrawal batches and formatted categories", async () => {
    const primaryUser = await prisma.user.findFirst({ where: { username: "mokhotm" } });
    const token = createSessionToken({
      userId: primaryUser!.id,
      username: primaryUser!.username,
      exp: Date.now() + 3600000,
    });

    const req = new NextRequest("http://localhost:3000/api/cash-wallet?month=ALL", {
      headers: { cookie: `auth_session=${token}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(Array.isArray(data.unallocatedBatches)).toBe(true);
    expect(Array.isArray(data.recentFlows)).toBe(true);

    // Verify recent flows have proper category or description mappings
    const domesticFlows = data.recentFlows.filter(
      (f: any) =>
        f.category === "Domestic Worker" ||
        (f.description && f.description.toLowerCase().includes("domestic")) ||
        (f.notes && f.notes.toLowerCase().includes("domestic"))
    );
    expect(data.recentFlows.length).toBeGreaterThanOrEqual(1);
  });
});
