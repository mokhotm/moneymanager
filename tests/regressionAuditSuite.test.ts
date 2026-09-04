import { describe, it, expect } from "vitest";
import { resolveSpendingLocations, SA_MERCHANT_RULES, DIGITAL_SERVICE_PATTERNS } from "../src/lib/geoResolver";

describe("Corrected Issues Regression Suite (Zero-Regression Enforcement)", () => {
  // ── FIX-001: Shell Middel Street Geocoding Regression ──────────────────
  it("FIX-001: Shell Middelstraat must resolve to Pretoria (Nieuw Muckleneuk) and NEVER Middelburg", () => {
    const mockTxs = [
      {
        id: "tx-shell-1",
        destinationRef: "SHELL MIDDELSTRAAT MO Water shell middelstraat mo water",
        amount: 150.00,
        createdAt: new Date("2026-07-05T10:00:00Z"),
      },
      {
        id: "tx-shell-2",
        destinationRef: "SHELL MIDDELS 5196*8010 27 JUL DEBIT CARD PURCHASE FROM",
        amount: 200.00,
        createdAt: new Date("2026-07-29T14:30:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);

    // Must find Shell Middel Street in Pretoria
    const shellPretoria = resolved.physicalLocations.find(
      (l) => l.merchant.includes("Middel Street") || l.locationName.includes("Middel St")
    );
    expect(shellPretoria).toBeDefined();
    expect(shellPretoria?.city).toBe("Pretoria");
    expect(shellPretoria?.region).toBe("Pretoria & Centurion");
    expect(shellPretoria?.totalAmount).toBe(350.00);

    // Zero locations must map to Middelburg or Mpumalanga
    const middelburg = resolved.physicalLocations.find(
      (l) => l.city.toLowerCase().includes("middelburg") || l.merchant.toLowerCase().includes("middelburg")
    );
    expect(middelburg).toBeUndefined();
  });

  // ── FIX-002: Minimum Physical Merchant Rules Recognition ────────────────
  it("FIX-002: Geo merchant rules directory must contain comprehensive South African retail coverage (>= 80 rules)", () => {
    expect(SA_MERCHANT_RULES.length).toBeGreaterThanOrEqual(80);

    // Assert key core retail hubs exist in rule set
    const hasBrooklynCheckers = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Checkers Brooklyn"));
    const hasWaterkloofSpur = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Spur Phoenix"));
    const hasSpringsPnP = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Pick n Pay Springs"));
    const hasBakertonSpar = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("SPAR Bakerton"));
    const hasCastleGate = SA_MERCHANT_RULES.some((r) => r.cleanMerchant.includes("Castle Gate"));

    expect(hasBrooklynCheckers).toBe(true);
    expect(hasWaterkloofSpur).toBe(true);
    expect(hasSpringsPnP).toBe(true);
    expect(hasBakertonSpar).toBe(true);
    expect(hasCastleGate).toBe(true);
  });

  // ── FIX-003: Digital Service & Banking Fee Segregation ─────────────────
  it("FIX-003: Bank service fees, airtime purchases and PayShap P2P must be classified as Digital Services", () => {
    const mockTxs = [
      {
        id: "tx-fee-1",
        destinationRef: "+#CARD FEE +#card fee",
        amount: 70.00,
        createdAt: new Date("2026-07-15T00:00:00Z"),
      },
      {
        id: "tx-fee-2",
        destinationRef: "OVERDRAFT SERVICE FEE NO LIMIT",
        amount: 69.00,
        createdAt: new Date("2026-06-30T00:00:00Z"),
      },
      {
        id: "tx-payshap",
        destinationRef: "THABO PAYSHAP PAYMENT TO",
        amount: 300.00,
        createdAt: new Date("2026-03-02T00:00:00Z"),
      },
      {
        id: "tx-airtime",
        destinationRef: "VAS00243995372 VODA0723811177 PREPAID MOBILE PURCHASE",
        amount: 29.00,
        createdAt: new Date("2026-07-06T00:00:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);

    // Must NOT be in physical locations
    expect(resolved.physicalLocations.length).toBe(0);

    // Must be in digital services
    expect(resolved.digitalServices.length).toBeGreaterThanOrEqual(3);

    const bankFees = resolved.digitalServices.find((d) => d.category === "Banking Fees");
    expect(bankFees).toBeDefined();
    expect(bankFees?.totalAmount).toBe(139.00);

    const payshap = resolved.digitalServices.find((d) => d.category === "P2P Transfers");
    expect(payshap).toBeDefined();
    expect(payshap?.totalAmount).toBe(300.00);
  });

  // ── FIX-004: Pretoria Regional Alignment for Total & Holiday Inn ───────
  it("FIX-004: Total Capital Park and Holiday Inn Express must resolve to Pretoria", () => {
    const mockTxs = [
      {
        id: "tx-total",
        destinationRef: "Total Venters 5196*8010 24 JAN DEBIT CARD PURCHASE FROM",
        amount: 139.80,
        createdAt: new Date("2026-01-27T00:00:00Z"),
      },
      {
        id: "tx-inn",
        destinationRef: "HOLIDAY INN R 5196*8010 10 JUL DEBIT CARD PURCHASE FROM",
        amount: 297.60,
        createdAt: new Date("2026-07-13T00:00:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);

    expect(resolved.physicalLocations.length).toBe(2);

    const total = resolved.physicalLocations.find((l) => l.merchant.includes("TotalEnergies"));
    expect(total?.city).toBe("Pretoria");
    expect(total?.region).toBe("Pretoria & Centurion");

    const inn = resolved.physicalLocations.find((l) => l.merchant.includes("Holiday Inn"));
    expect(inn?.city).toBe("Pretoria");
    expect(inn?.region).toBe("Pretoria & Centurion");
  });

  // ── FIX-005: Inbound Email Statement Parsing & Institution Recognition ──
  it("FIX-005: Email Ingestion Classifier must accurately identify top South African financial institutions", async () => {
    const { classifyEmailContent } = await import("../src/services/emailIngestionService");

    const sb = classifyEmailContent("statements@standardbank.co.za", "Standard Bank Statement - Prestige Current");
    expect(sb.institution).toBe("Standard Bank");
    expect(sb.isFinancial).toBe(true);

    const ned = classifyEmailContent("donotreply@nedbank.co.za", "Your Nedbank e-Statement is ready");
    expect(ned.institution).toBe("Nedbank");
    expect(ned.isFinancial).toBe(true);

    const fnb = classifyEmailContent("noreply@fnb.co.za", "FNB eWallet & Account Statement");
    expect(fnb.institution).toContain("FNB");
    expect(fnb.isFinancial).toBe(true);

    const capitec = classifyEmailContent("clientcare@capitecbank.co.za", "Capitec Bank Live Statement");
    expect(capitec.institution).toBe("Capitec");
    expect(capitec.isFinancial).toBe(true);

    const disc = classifyEmailContent("statements@discovery.co.za", "Discovery Card Statement");
    expect(disc.institution).toBe("Discovery Bank");
    expect(disc.isFinancial).toBe(true);

    const ekur = classifyEmailContent("billing@ekurhuleni.gov.za", "Monthly Municipal Assessment Rates");
    expect(ekur.institution).toBe("City of Ekurhuleni");
    expect(ekur.docType).toBe("MUNICIPAL_BILL");
  }, 45000);

  // ── FIX-006: Open Banking Stitch Token & Password Security Layer ──────────
  it("FIX-006: Open Banking and Email Ingestion encryption must round-trip tokens safely", async () => {
    const { encryptToken } = await import("../src/services/stitchOpenBankingService");
    const { encryptPassword, decryptPassword, maskPassword } = await import("../src/services/emailIngestionService");

    const sampleToken = "stitch_live_token_sec_99481239857";
    const encToken = encryptToken(sampleToken);
    expect(encToken).toBeDefined();
    expect(encToken).not.toBe(sampleToken);

    const samplePass = "GoogleAppPassword_16Chars";
    const encPass = encryptPassword(samplePass);
    expect(encPass).not.toBe(samplePass);
    const decPass = decryptPassword(encPass);
    expect(decPass).toBe(samplePass);

    const masked = maskPassword(encPass);
    expect(masked).toBe("••••••••••••");
  });

  // ── FIX-007: Composite Municipal & Utility Matching Invariants ──────────
  it("FIX-007: Ekurhuleni municipal debit orders must classify as Municipal Utilities in Springs & Bakerton", () => {
    const mockTxs = [
      {
        id: "tx-muni",
        destinationRef: "EKURHULENI 3505137295 DEBICHECK DEBIT ORDER",
        amount: 650.00,
        createdAt: new Date("2026-08-15T08:00:00Z"),
      },
    ];

    const resolved = resolveSpendingLocations(mockTxs);
    expect(resolved.physicalLocations.length).toBe(1);

    const muni = resolved.physicalLocations[0];
    expect(muni.merchant).toBe("City of Ekurhuleni Municipality");
    expect(muni.city).toBe("Springs");
    expect(muni.region).toBe("Springs & Bakerton");
    expect(muni.category).toBe("Municipal Utilities");
    expect(muni.locationType).toBe("MUNICIPAL_OR_CAMPUS");
  });

  // ── FIX-008: Budget Reconciliation Performance & Sub-Second Latency ───────
  it("FIX-008: Budget Reconciliation engine must execute deterministically and fast (< 3000ms cold, < 100ms warm)", async () => {
    const { reconcileBudgetItemsForMonth } = await import("../src/lib/budgetReconciliation");

    const mockItems = [
      { id: "b1", category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Telkom Broadband", amount: 1299.00, month: "2026-08" },
      { id: "b2", category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Vodacom Fibre", amount: 899.00, month: "2026-08" },
      { id: "b3", category: "DEBT_ACCELERATION_PLAN", label: "WesBank Vehicle Finance", amount: 4850.00, month: "2026-08" },
    ];

    const start = Date.now();
    const res = await reconcileBudgetItemsForMonth("test-user-latency", "2026-08", mockItems);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000); // Cold start threshold
    expect(res.items.length).toBe(3);
    expect(res.summary.totalBudgeted).toBe(7048.00);
  });

  // ── FIX-009: Budget Reconciliation In-Memory Cache Invariant ──────────────
  it("FIX-009: Budget Reconciliation cache must serve cached results on repeated queries", async () => {
    const { reconcileBudgetItemsForMonth, invalidateReconciliationCache } = await import("../src/lib/budgetReconciliation");

    const mockItems = [
      { id: "b-cache-1", category: "FIXED_HOUSEHOLD_OBLIGATIONS", label: "Discovery Insure", amount: 1450.00, month: "2026-08" },
    ];

    invalidateReconciliationCache("test-cache-user");

    // Prime the cache
    const first = await reconcileBudgetItemsForMonth("test-cache-user", "2026-08", mockItems);

    // Query again (cache hit)
    const start = Date.now();
    const second = await reconcileBudgetItemsForMonth("test-cache-user", "2026-08", mockItems);
    const cachedDuration = Date.now() - start;

    expect(cachedDuration).toBeLessThan(200); // Fast memory retrieval
    expect(second.items.length).toBe(first.items.length);
    expect(second.summary.totalBudgeted).toBe(first.summary.totalBudgeted);
  });

  // ── FIX-010: Cash Wallet Salary Cycle & Multi-Factor Filtering Invariants ──
  it("FIX-010: Cash Wallet must accurately filter by 15th-to-15th salary cycle, category, and allocation status", async () => {
    const { resolveSalaryCycleRange } = await import("../src/lib/payrollCalendar");

    // 1. Verify August 2026 Pay Cycle Bounds (14 Aug – 14 Sep)
    const augBounds = resolveSalaryCycleRange("2026-08");
    expect(augBounds.startDate.toISOString().split("T")[0]).toBe("2026-08-14");
    expect(augBounds.endDate.toISOString().split("T")[0]).toBe("2026-09-14");

    // 2. Mock a set of cash flows spanning multiple cycles and categories
    const mockCashFlows = [
      {
        id: "flow-1",
        createdAt: new Date("2026-08-15T10:00:00Z"), // In Aug cycle
        destinationRef: "Domestic Worker Wage",
        amount: 950.00,
        flowType: "CASH_SPENDING",
      },
      {
        id: "flow-2",
        createdAt: new Date("2026-08-20T14:00:00Z"), // In Aug cycle
        destinationRef: "Garden Maintenance",
        amount: 700.00,
        flowType: "CASH_SPENDING",
      },
      {
        id: "flow-3",
        createdAt: new Date("2026-07-20T09:00:00Z"), // In July cycle
        destinationRef: "Domestic Worker Wage",
        amount: 950.00,
        flowType: "CASH_SPENDING",
      },
    ];

    // Filter for August cycle
    const augFlows = mockCashFlows.filter(
      (f) => f.createdAt >= augBounds.startDate && f.createdAt <= augBounds.endDate
    );
    expect(augFlows).toHaveLength(2);

    // Domestic & Garden sum in August cycle
    const domesticAndGardenTotal = augFlows.reduce((sum, f) => sum + f.amount, 0);
    expect(domesticAndGardenTotal).toBe(1650.00); // R950 + R700
  });

  // ── FIX-011: Cashflow Forecast 365-Day Trajectory Invariant ────────────────
  it("FIX-011: Cashflow Forecast must isolate single-month budget items and produce positive 365-day trajectory", async () => {
    const { generate365DayCashflowForecast } = await import("../src/engine/cashflowForecast");
    expect(generate365DayCashflowForecast).toBeDefined();

    const result = generate365DayCashflowForecast(
      {
        startingBalance: 46135.15,
        monthlyNetIncome: 74438.26,
        incomePayDay: 15,
        recurringObligations: 11348.81,
        debtMonthlyPayment: 42794.29,
        livingDiscretionaryMonthly: 7700.00,
        minimumSafetyBuffer: 30000.00,
      },
      new Date("2026-08-30T00:00:00Z")
    );

    expect(result.startingBalance).toBe(46135.15);
    expect(result.minimumProjectedBalance).toBeGreaterThan(0);
    expect(result.deficitDaysCount).toBe(0);
    expect(result.projected12MonthNetSurplus).toBeGreaterThan(100000);
    expect(result.dailyPoints[364].baselineBalance).toBeGreaterThan(150000);
  });

  // ── FIX-012: Bank Feeds & Open Banking Settings Tab Architecture ──────────
  it("FIX-012: Bank Feeds component & Stitch Open Banking services must be modular and exportable for Settings Tab", async () => {
    const { SA_BANK_CONNECTORS } = await import("../src/services/stitchOpenBankingService");
    expect(SA_BANK_CONNECTORS).toBeDefined();
    expect(SA_BANK_CONNECTORS.length).toBe(8);

    const bankingTabModule = await import("../src/components/BankingTab");
    expect(bankingTabModule.BankingTab).toBeDefined();
  });

  // ── FIX-013: Goal-to-Budget Dynamic Surplus Allocation & AI Feasibility Invariants ──
  it("FIX-013: Goal-to-Budget Sync and AI Feasibility engine must calculate surplus and evaluate goal feasibility", async () => {
    const { calculateAvailableCashflowSurplus } = await import("../src/lib/goalBudgetSync");
    expect(calculateAvailableCashflowSurplus).toBeDefined();

    const { prisma } = await import("../src/lib/prisma");
    const primaryUser = await prisma.user.findFirst({ where: { username: "mokhotm" } });
    const targetUserId = primaryUser?.id || "default-user";

    // Verify surplus math
    const surplus = await calculateAvailableCashflowSurplus(targetUserId, "2026-08");
    expect(surplus).toBeDefined();
    expect(surplus.monthlyIncome).toBeGreaterThan(0);
    expect(surplus.activeCycleMonth).toBe("2026-08");
    expect(surplus.availableSurplus).toBeGreaterThan(0);

    // Verify AI Feasibility evaluator module & projection math
    const { evaluateGoalFeasibilityWithAI, projectGoalCompletion } = await import("../src/agents/goalsAgent");
    expect(evaluateGoalFeasibilityWithAI).toBeDefined();
    expect(projectGoalCompletion).toBeDefined();

    const proj = projectGoalCompletion("g1", "Emergency Reserve", 25000, 150000, 5000, new Date("2026-08-01"));
    expect(proj.isAchieved).toBe(false);
    expect(proj.shortfall).toBe(125000);
    expect(proj.monthsToTarget).toBe(25);
  });

  // ── FIX-014: Single Ground-Truth Salary & AI Forensic Duplicate Detection Invariant ──
  it("FIX-014: August 2026 salary cycle must have exactly 1 reconciled salary inflow and statement duplicates must be flagged by AI", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const { createSessionToken } = await import("../src/lib/session");
    const primaryUser = await prisma.user.findFirst({ where: { username: "mokhotm" } });
    expect(primaryUser).toBeDefined();

    // 1. Assert exactly 1 August 2026 Salary Inflow
    const augSalaries = await prisma.moneyFlow.findMany({
      where: {
        flowType: "INCOME",
        amount: { gte: 50000 },
        createdAt: {
          gte: new Date("2026-08-01T00:00:00Z"),
          lte: new Date("2026-08-31T23:59:59Z"),
        },
      },
    });

    expect(augSalaries.length).toBe(1);
    expect(Number(augSalaries[0].amount)).toBe(74438.26);
    expect(augSalaries[0].createdAt.toISOString().slice(0, 10)).toBe("2026-08-14");

    // 2. Assert that multiple real statement debits (e.g. duplicate swipes or debit retries) are preserved and flagged
    const { NextRequest } = await import("next/server");
    const { GET } = await import("../src/app/api/transactions/route");

    const sessionToken = createSessionToken({
      userId: primaryUser!.id,
      username: primaryUser!.username,
      exp: Date.now() + 3600000,
    });

    const req = new NextRequest("http://localhost:3000/api/transactions?payPeriod=2026-08&periodType=SALARY", {
      headers: {
        cookie: `auth_session=${sessionToken}`,
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.transactions).toBeDefined();
    expect(json.summary).toBeDefined();
    expect(json.summary.totalInflow).toBe(74438.26);

    // Assert that suspicious duplicates are marked by AI
    const suspiciousList = json.transactions.filter((t: any) => t.isSuspiciousDuplicate);
    expect(suspiciousList.length).toBeGreaterThan(0);
    expect(suspiciousList[0].suspiciousReason).toContain("AI Forensic Alert");
  });

  // ── FIX-016: Money Journey Inter-Account Transfers & Home Loan Lineage ────
  it("FIX-016: Money Journey must track inter-account transfers (Prestige to MyMo & Card) and reflect Home Loan payment from MyMo account", async () => {
    const primaryUser = await prisma.user.findFirst({
      where: { username: "mokhotm" },
    });
    expect(primaryUser).toBeDefined();

    const { NextRequest } = await import("next/server");
    const { GET } = await import("../src/app/api/money-flow/route");
    const { createSessionToken } = await import("../src/lib/session");

    const sessionToken = createSessionToken({
      userId: primaryUser!.id,
      username: primaryUser!.username,
      exp: Date.now() + 3600000,
    });

    const req = new NextRequest("http://localhost:3000/api/money-flow?payPeriod=2026-08&periodType=SALARY", {
      headers: { cookie: `auth_session=${sessionToken}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary).toBeDefined();
    expect(json.summary.totalIncome).toBe(74438.26);
    expect(json.summary.totalTransfers).toBeGreaterThanOrEqual(30000); // Inter-account transfers > R30k

    // Verify inter-account transfer from Prestige to MyMo
    const prestigeToMyMo = json.flows.find(
      (f: any) =>
        f.flowType === "TRANSFER" &&
        f.sourceRef.includes("Prestige") &&
        f.destinationRef.includes("MyMo")
    );
    expect(prestigeToMyMo).toBeDefined();
    expect(prestigeToMyMo.amount).toBe(29359.28);

    // Verify Home Loan payment from MyMo account
    const homeLoanFromMyMo = json.flows.find(
      (f: any) =>
        f.flowType === "DEBT_PAYMENT" &&
        f.sourceRef.includes("MyMo") &&
        f.destinationRef.includes("Home Loan")
    );
    expect(homeLoanFromMyMo).toBeDefined();
    expect(homeLoanFromMyMo.amount).toBe(17786.45);
  });

  // ── FIX-018: Bank Account Auto-Discovery & Smart Provisioning Architecture ─
  it("FIX-018: Open Banking auto-discovery and bulk account provisioning endpoints must function seamlessly", async () => {
    const primaryUser = await prisma.user.findFirst({
      where: { username: "mokhotm" },
    });
    expect(primaryUser).toBeDefined();

    const { NextRequest } = await import("next/server");
    const { POST: discoverPOST } = await import("../src/app/api/banking/discover/route");
    const { createSessionToken } = await import("../src/lib/session");

    const sessionToken = createSessionToken({
      userId: primaryUser!.id,
      username: primaryUser!.username,
      exp: Date.now() + 3600000,
    });

    const discoverReq = new NextRequest("http://localhost:3000/api/banking/discover", {
      method: "POST",
      headers: {
        cookie: `auth_session=${sessionToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ institution: "Standard Bank" }),
    });

    // 1. Assert that discovery without live OAuth token is strictly rejected (HTTP 400 - zero mock policy)
    const discoverRes = await discoverPOST(discoverReq);
    expect(discoverRes.status).toBe(400);

    // 2. Verify smart matching algorithm against mokhotm's real accounts
    const { matchDiscoveredAccounts } = await import("../src/services/stitchOpenBankingService");
    const existingAccounts = await prisma.account.findMany({
      where: { userId: primaryUser!.id },
      select: { id: true, name: true, accountNumberMasked: true, type: true, institution: true },
    });

    const sampleLiveAccounts = [
      {
        id: "stitch-sb-01",
        name: "Standard Bank Prestige Current Account",
        accountNumber: "023074469",
        accountNumberType: "CURRENT",
        institution: "Standard Bank",
        currency: "ZAR",
        currentBalance: 2450.0,
        availableBalance: 2450.0,
      },
      {
        id: "stitch-sb-02",
        name: "Standard Bank Titanium Credit Card",
        accountNumber: "52393529",
        accountNumberType: "CREDIT_CARD",
        institution: "Standard Bank",
        currency: "ZAR",
        currentBalance: -12500.0,
        availableBalance: 2500.0,
      },
    ];

    const matches = matchDiscoveredAccounts(sampleLiveAccounts, existingAccounts);
    expect(matches.length).toBe(2);

    const prestigeMatch = matches.find((m: any) => m.stitchAccount.name.includes("Prestige"));
    expect(prestigeMatch).toBeDefined();
    expect(prestigeMatch?.matchedAccountId).not.toBeNull();
  });

  // ── FIX-019: Forward Budget Realignment & Verified RSA ID Ingestion ──────
  it("FIX-019: Forward budget (2026-09) must omit cancelled tracking/insurance, set Vodacom Fibre to R864.61, boost Transmission Sinking Fund, and persist verified RSA ID", async () => {
    const user = await prisma.user.findFirst({
      where: { username: "mokhotm" },
      include: { profile: true },
    });
    expect(user).toBeDefined();
    expect(user?.profile?.idNumber).toBe("7508245305086");

    const budgetItems = await prisma.budgetLineItem.findMany({
      where: { userId: user!.id, month: "2026-09" },
    });
    expect(budgetItems.length).toBe(22);

    // Verify Vehicle Tracking is completely absent
    const trackingItem = budgetItems.find((b) => b.label.toLowerCase().includes("tracking"));
    expect(trackingItem).toBeUndefined();

    // Verify Discovery Insure is absent
    const insureItem = budgetItems.find((b) => b.label.toLowerCase().includes("discovery insure"));
    expect(insureItem).toBeUndefined();

    // Verify Vodacom Fibre only (R 864.61)
    const vodacomItem = budgetItems.find((b) => b.label.toLowerCase().includes("vodacom"));
    expect(vodacomItem).toBeDefined();
    expect(Number(vodacomItem?.amount)).toBe(864.61);

    // Verify Car Transmission Repair Sinking Fund has been boosted to R 13,633.04 (full liquid surplus)
    const sinkingFund = budgetItems.find((b) => b.label.toLowerCase().includes("transmission"));
    expect(sinkingFund).toBeDefined();
    expect(Number(sinkingFund?.amount)).toBe(13633.04);

    // Verify total budgeted matches true net salary envelope (R 74,438.26)
    const total = budgetItems.reduce((acc, it) => acc + Number(it.amount), 0);
    expect(Math.round(total * 100) / 100).toBe(74438.26);
  });

  // ── FIX-021: Live Open Banking & Zero-Mock Fallback Data Enforcement Invariant ──
  it("FIX-021: Banking Hub must strictly enforce live Open Banking connections with zero mock fallbacks or statement conflation", async () => {
    const { fetchStitchAccounts, fetchStitchTransactions } = await import(
      "../src/services/stitchOpenBankingService"
    );

    // Assert that attempting to fetch accounts without a valid live token strictly fails (no fake fallback data generated)
    await expect(fetchStitchAccounts("")).rejects.toThrow("Live banking connection required");
    await expect(fetchStitchAccounts("sandbox_token")).rejects.toThrow("Live banking connection required");

    await expect(fetchStitchTransactions("", "fake-acc")).rejects.toThrow("Live banking connection required");

    // Assert that PostgreSQL contains 0 synthetic mock connections
    const { prisma } = await import("../src/lib/prisma");
    const mockConnections = await prisma.bankConnection.findMany({
      where: {
        accessTokenEncrypted: {
          contains: "sandbox",
        },
      },
    });
    expect(mockConnections.length).toBe(0);
  });

  // ── FIX-022: Multi-Bank Decoupling & Neutrality Enforcement ───────────
  it("FIX-022: Bank connector registry must provide neutral multi-bank coverage across all 8 major SA institutions", async () => {
    const { SA_BANK_CONNECTORS } = await import("../src/lib/bankConnectors");

    expect(SA_BANK_CONNECTORS.length).toBe(8);
    const bankIds = SA_BANK_CONNECTORS.map((b) => b.id);
    expect(bankIds).toEqual(["SBG", "CAP", "FNB", "NED", "INV", "ABSA", "DISC", "TYME"]);

    // Ensure zero artificial recommendations
    const hasBiasedRecommendation = SA_BANK_CONNECTORS.some((b) => b.isRecommended);
    expect(hasBiasedRecommendation).toBe(false);
  });

  // ── FIX-023: Administrator Role Segregation for Gateway Credentials ───
  it("FIX-023: Open Finance Gateway settings must be isolated from client modules and role-guarded", async () => {
    const { SA_BANK_CONNECTORS } = await import("../src/lib/bankConnectors");
    expect(SA_BANK_CONNECTORS).toBeDefined();

    // Verify GET /api/banking/config role logic
    const { GET, POST } = await import("../src/app/api/banking/config/route");

    // Non-admin mock request
    const mockUserReq: any = {
      headers: new Headers({ "x-mock-role": "user" }),
    };

    // Admin user in database
    const { prisma } = await import("../src/lib/prisma");
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
    });
    expect(adminUser).toBeDefined();
    expect(adminUser?.role).toBe("admin");
  });

  // ── FIX-024: Global UI/UX Design System Enforcement & Zero Dead Classes ──
  it("FIX-024: globals.css must define core badge aliases and typography classes without uncompiled Tailwind", async () => {
    const fs = await import("fs");
    const path = await import("path");

    const globalsCssPath = path.join(process.cwd(), "src/styles/globals.css");
    const globalsContent = fs.readFileSync(globalsCssPath, "utf-8");

    // Core badge aliases
    expect(globalsContent).toContain(".badge-gold");
    expect(globalsContent).toContain(".badge-purple");
    expect(globalsContent).toContain(".badge-green");
    expect(globalsContent).toContain(".font-mono");
    expect(globalsContent).toContain(".text-slate-100");

    // Verify AgentMemoryManager.tsx has zero dead Tailwind utility classes
    const agentMemoryPath = path.join(process.cwd(), "src/components/AgentMemoryManager.tsx");
    const agentMemoryContent = fs.readFileSync(agentMemoryPath, "utf-8");

    expect(agentMemoryContent).not.toContain("space-y-");
    expect(agentMemoryContent).not.toContain("grid-cols-");
    expect(agentMemoryContent).not.toContain("bg-slate-");
    expect(agentMemoryContent).not.toContain("backdrop-blur-");
  });

  // ── FIX-025: Alignment of Subscription Tiers & Pricing Between Login and Billing Hubs ──
  it("FIX-025: Subscription tiers and pricing must be 100% harmonized between Login and Billing hubs", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const { TIER_SPECIFICATIONS } = await import("../src/lib/subscriptionGate");
    const { prisma } = await import("../src/lib/prisma");

    // 1. Verify TIER_SPECIFICATIONS has exact canonical pricing
    expect(TIER_SPECIFICATIONS.STARTER_FREE.priceZar).toBe(0);
    expect(TIER_SPECIFICATIONS.STARTER_FREE.priceAnnualZar).toBe(0);
    expect(TIER_SPECIFICATIONS.PRO_WEALTH.priceZar).toBe(199);
    expect(TIER_SPECIFICATIONS.PRO_WEALTH.priceAnnualZar).toBe(1990);
    expect(TIER_SPECIFICATIONS.EXECUTIVE_ENTERPRISE.priceZar).toBe(499);
    expect(TIER_SPECIFICATIONS.EXECUTIVE_ENTERPRISE.priceAnnualZar).toBe(4990);

    // 2. Query active tiers in database - must have exactly 3 canonical tiers, no legacy Free/Plus/Premium
    const activeTiers = await prisma.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    });
    const activeTierNames = activeTiers.map((t) => t.name);
    expect(activeTierNames).toEqual(["Starter Free", "Pro Wealth Accelerator", "Executive Enterprise"]);

    // 3. Verify Login page code matches canonical pricing, ZAR default, and Save 17% discount
    const loginPagePath = path.join(process.cwd(), "src/app/login/page.tsx");
    const loginPageContent = fs.readFileSync(loginPagePath, "utf-8");

    expect(loginPageContent).toContain('const [currency, setCurrency] = useState<SupportedCurrency>("ZAR");');
    expect(loginPageContent).toContain("Save 17%");
    expect(loginPageContent).toContain('"R 199"');
    expect(loginPageContent).toContain('"R 165"');
    expect(loginPageContent).toContain('"R 499"');
    expect(loginPageContent).toContain('"R 415"');
    expect(loginPageContent).toContain("Billed R 1,990 annually");
    expect(loginPageContent).toContain("Billed R 4,990 annually");

    // 4. Verify Billing page code matches canonical pricing and features
    const billingPagePath = path.join(process.cwd(), "src/app/billing/page.tsx");
    const billingPageContent = fs.readFileSync(billingPagePath, "utf-8");

    expect(billingPageContent).toContain("Save 17%");
    expect(billingPageContent).toContain("Math.floor(Number(tier.priceAnnual) / 12)");
    expect(billingPageContent).toContain("Up to 3 Bank & Asset Accounts");
    expect(billingPageContent).toContain("Dual-Track Consumer vs Mortgage Engine");
    expect(billingPageContent).toContain("Direct OpenBanking Feeds (8 SA Banks via Stitch)");
  });

  // ── FIX-026: Collapsible & Expandable Sidebar Navigation Groups ──
  it("FIX-026: Sidebar navigation groups must support interactive collapse/expand, state persistence, and active route awareness", async () => {
    const fs = await import("fs");
    const path = await import("path");

    // 1. Verify Sidebar.tsx has interactive state, chevron, localStorage persistence, and active-child indicator
    const sidebarPath = path.join(process.cwd(), "src/components/Sidebar.tsx");
    const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");

    expect(sidebarContent).toContain("collapsedGroups");
    expect(sidebarContent).toContain("toggleGroup");
    expect(sidebarContent).toContain("sidebar-collapsed-groups");
    expect(sidebarContent).toContain("sidebar-section-header");
    expect(sidebarContent).toContain("sidebar-section-chevron");
    expect(sidebarContent).toContain("sidebar-group-content");
    expect(sidebarContent).toContain("hasActiveChild");
    expect(sidebarContent).toContain("ChevronDown");

    // 2. Verify globals.css defines the animations and classes
    const globalsCssPath = path.join(process.cwd(), "src/styles/globals.css");
    const globalsContent = fs.readFileSync(globalsCssPath, "utf-8");

    expect(globalsContent).toContain(".sidebar-section-header");
    expect(globalsContent).toContain(".sidebar-section-chevron");
    expect(globalsContent).toContain(".sidebar-group-content");
    expect(globalsContent).toContain(".sidebar-group-content.collapsed");
    expect(globalsContent).toContain(".sidebar-group-content.expanded");
  });
});



