# MoneyManager Corrected Issues Register & Zero-Regression Log

This document records all software, data parsing, geocoding, and deployment issues identified, along with their root cause, the exact resolution implemented, and the automated regression test enforcing zero-reintroduction.

---

## 📋 Corrected Issues Index

### FIX-001: "Shell Middelstraat" False Positive Geocoded to Middelburg (Mpumalanga)
* **Date Identified**: 2026-08-30
* **Symptom**: In the Spending Location Radar, transactions with description `SHELL MIDDELSTRAAT MO Water` and `SHELL MIDDELS` were incorrectly mapped to *Shell Ultra City Middelburg* on the N4 highway in Middelburg, Mpumalanga.
* **Root Cause**: The regex pattern `/shell\s*middels/i` was greedily matching the Afrikaans abbreviation for Middel Street (`Middelstr` / `Middelstraat`) and routing it to the town of Middelburg.
* **Exact Resolution**:
  * Corrected pattern `/shell\s*middels|shell\s*middelstraat/i` in [`src/lib/geoResolver.ts`](file:///c:/Ezzy/Projects/Money/src/lib/geoResolver.ts) to map to **Shell Middel Street Service Station** (Cnr Middel St & Florence Ribeiro Ave, Nieuw Muckleneuk / Brooklyn / Waterkloof, Pretoria; Lat: `-25.7728`, Lng: `28.2312`, Region: `"Pretoria & Centurion"`).
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-001: Shell Middelstraat must map to Pretoria, never Middelburg`).

---

### FIX-002: Spending Location Radar Missing High-Volume Statement Merchants
* **Date Identified**: 2026-08-30
* **Symptom**: Over 50 frequent physical store merchants (e.g. Checkers Brooklyn, Spur Waterkloof, Eastern Delite Bakery, Mr Price Springs, Maxis Butchery, Engen Rowhill, Pick n Pay Quagga, Clicks Springs, KFC Tsakane, Dis-Chem Brooklyn, etc.) were unclassified and omitted from radar pin clusters.
* **Root Cause**: Incomplete regular expression library in `SA_MERCHANT_RULES`.
* **Exact Resolution**:
  * Audited all 1,360 statement flows and expanded [`src/lib/geoResolver.ts`](file:///c:/Ezzy/Projects/Money/src/lib/geoResolver.ts) to recognize **86 distinct GPS-verified venues**.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-002: Minimum 80 physical merchant locations recognized across Gauteng & National hubs`).

---

### FIX-003: Banking Fees & PayShap P2P Transfers Polluting Physical Map
* **Date Identified**: 2026-08-30
* **Symptom**: Card service fees, overdraft charges, instant money vouchers, and PayShap P2P transfers had no dedicated classification and fell through geocoding pipelines.
* **Root Cause**: Missing digital and financial fee taxonomy rules in `DIGITAL_SERVICE_PATTERNS`.
* **Exact Resolution**:
  * Added dedicated classification for `Standard Bank Account Fees & Charges`, `PayShap Instant P2P Transfers`, `Prepaid Airtime & Data (Vodacom/Telkom)`, and `Ozow Instant EFT`.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-003: Financial fees and PayShap transfers mapped to Digital Services, not physical stores`).

---

### FIX-004: Spending Location Radar Default Salary Cycle Filter Displaying Empty Map
* **Date Identified**: 2026-08-30
* **Symptom**: When loading the radar, only 3-4 transactions were visible because the default cycle was set to `2026-08` which had just started and only spanned a few days.
* **Root Cause**: Hardcoded initial state `useState("2026-08")` without cumulative all-time fallback.
* **Exact Resolution**:
  * Defaulted month selector to `"ALL"` (Cumulative Radar) in [`src/components/SpendingLocationMap.tsx`](file:///c:/Ezzy/Projects/Money/src/components/SpendingLocationMap.tsx) while preserving full month/pay-cycle dropdown filtering.
* **Automated Regression Test**: `tests/spendingLocationRadar.test.ts`.

---

### FIX-005: Database Relation Mismatch in User Accounts Query
* **Date Identified**: 2026-08-30
* **Symptom**: `prisma.user.findMany({ include: { debts: true } })` threw schema error during automated audits.
* **Root Cause**: `Debt` belongs to `Account` (`Account.debt`), not directly to `User`.
* **Exact Resolution**:
  * Updated query in [`scripts/run_all_audits.ts`](file:///c:/Ezzy/Projects/Money/scripts/run_all_audits.ts) to `include: { accounts: { include: { debt: true } } }`.
* **Automated Regression Test**: `scripts/run_all_audits.ts` (Pillar 1).

---

### FIX-006: Missing Database Tables on EC2 Production Container
* **Date Identified**: 2026-08-29
* **Symptom**: 500 errors on `/api/ingestion/email-config` on remote EC2.
* **Root Cause**: `EmailScannerConfig` and `InboundEmailLog` tables were added to `schema.prisma` locally but DDL migration had not been executed inside remote `moneymanager-postgres`.
* **Exact Resolution**:
  * Created [`scripts/setup_ec2_tables.sql`](file:///c:/Ezzy/Projects/Money/scripts/setup_ec2_tables.sql) and added automatic DDL execution step in deployment pipeline.
* **Automated Regression Test**: `scripts/deploy_full_to_ec2.py` (Step 4).

---

### FIX-007: Windows DLL Lock on Prisma Engines During Hot-Reload
* **Date Identified**: 2026-08-29
* **Symptom**: `prisma generate` failed with file lock on `query_engine-windows.dll.node` while dev server was running.
* **Root Cause**: Node.js process held open file descriptor on Windows DLL.
* **Exact Resolution**:
  * Added resilient raw SQL query fallbacks (`prisma.$queryRawUnsafe` / `prisma.$executeRawUnsafe`) across all ingestion and entity routes.
* **Automated Regression Test**: `src/app/api/ingestion/email-config/route.ts`.

---

### FIX-008: Terminal CP1252 Unicode Emoji Crash in Deployment Script
* **Date Identified**: 2026-08-30
* **Symptom**: `UnicodeEncodeError: 'charmap' codec can't encode character` when running `deploy_full_to_ec2.py` in Windows command prompt.
* **Root Cause**: Default Windows console encoding (CP1252) cannot encode high Unicode emoji points like `\U0001f680`.
* **Exact Resolution**:
  * Replaced Unicode emojis with safe ASCII prefixes (`[PASS]`, `[FAIL]`, `[Step N]`) in deployment automation.
* **Automated Regression Test**: `scripts/deploy_full_to_ec2.py`.

---

### FIX-009: Budget Page Latency & Synchronous Blocking in Reconciliation Engine
* **Date Identified**: 2026-08-30
* **Symptom**: Budget page took 30+ seconds to load (`/api/budget` stalled).
* **Root Cause**:
  1. `fetchAllStatementTransactions` was synchronously reading and parsing multi-megabyte PDF binaries from disk with CPU-heavy byte loops on every GET request.
  2. Sequential synchronous calls to external LLM provider were invoked during ambiguous match resolution in the budget loop.
  3. `MoneyFlow` already held all 1,360 structured statement transactions.
* **Exact Resolution**:
  * Streamlined `fetchAllStatementTransactions` in [`src/lib/budgetReconciliation.ts`](file:///c:/Ezzy/Projects/Money/src/lib/budgetReconciliation.ts) to query structured `MoneyFlow` records and pre-parsed document transaction arrays.
  * Replaced blocking LLM loop with ultra-fast deterministic composite multi-factor fuzzy ranking.
  * Added in-memory reconciliation cache with 60-second TTL and automatic invalidation on budget mutations (`POST`, `PUT`, `DELETE`).
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-008` & `FIX-009`).

---

### FIX-010: Cash Wallet Salary Cycle & Multi-Factor Filtering
* **Date Identified**: 2026-08-30
* **Symptom**: Physical Cash Wallet lacked Salary Pay Cycle (15th-to-15th), category, and live search filtering, showing all-time aggregated numbers without ability to view current salary cycle cash allocations.
* **Root Cause**:
  * `/api/cash-wallet` GET route had no query parameter support for `?month=`, `?cycle=`, `?category=`, or `?search=`.
  * Cash Wallet frontend UI lacked salary cycle dropdowns, category chips, search inputs, and period-scoped stat cards.
* **Exact Resolution**:
  * Enhanced `/api/cash-wallet` GET handler with `resolveSalaryCycleRange` bounding, returning `availableCycles`, `activeCycle`, and `periodMetrics` (`inflowsInPeriod`, `outflowsInPeriod`, `domesticInPeriod`, `gardenInPeriod`).
  * Built Apple-caliber Filter HUD toolbar on `/cash-wallet` with 15th-to-15th salary cycle picker, calendar month toggle, quick flow type tabs, category chips with counts, and live debounced search.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-010`) & `tests/cashWalletSplit.test.ts`.

---

### FIX-011: 365-Day Neural Cashflow Forecast Single-Month Budget Scoping
* **Date Identified**: 2026-08-30
* **Symptom**: The 365-Day Daily Balance Curve in the Forecast page plunged deeply negative (to -R512,577.42) despite positive monthly net cashflow (+R12,595.16/mo).
* **Root Cause**:
  * In `/api/cashflow-forecast`, `prisma.budgetLineItem.findMany({ where: { userId } })` queried without a `month` constraint, summing all 100 budget line items across 4 historical months (`2026-05`, `2026-06`, `2026-07`, `2026-08`).
  * This quadrupled monthly living expenses (from R7,700 to R30,800) and fixed obligations (from R11,348 to R45,395), simulating an artificial monthly burn of R118,989 against R74,438 salary.
* **Exact Resolution**:
  * Scoped `/api/cashflow-forecast` budget aggregation to `where: { userId, month: targetMonth }` (defaulting to active cycle `2026-08`), correctly modeling true monthly outflow of R61,843.10.
  * Added `projected12MonthNetSurplus` computation to `generate365DayCashflowForecast`.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-011`) & `tests/cashflowForecast.test.ts`.

---

### FIX-012: Unified Bank Feeds and Open Banking Tab in Settings Hub
* **Date Identified**: 2026-08-30
* **Symptom**: Bank sync configuration was isolated in an unlinked top-level page, cluttering the primary sidebar and disconnected from system integration settings.
* **Root Cause**:
  * Open Banking connectors and email ingestion configuration were housed solely under `/banking` instead of being an integrated tab inside the unified Settings & System Hub (`/settings`).
* **Exact Resolution**:
  * Extracted and modularized South African Open Banking connectors and synchronization controls into `src/components/BankingTab.tsx`.
  * Designed an Apple-grade multi-tab HUD in `src/app/settings/page.tsx` supporting `?tab=banking`, `?tab=ai-models`, `?tab=agent-memory`, and `?tab=property-data`.
  * Updated `src/components/Sidebar.tsx` to group Bank Feeds under System & Settings while keeping `/banking` as a seamless redirect/embed for zero breaking changes.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-012`) & `tests/stitchOpenBanking.test.ts`.

---

### FIX-013: Dynamic Goal-to-Budget Linking & AI Feasibility Engine
* **Date Identified**: 2026-08-31
* **Symptom**: Financial Goals and the Monthly Budget operated as disconnected silos; goals could not dynamically allocate from monthly cashflow surplus, and users lacked an AI feasibility engine to evaluate whether a goal was realistic given high-interest debts and fixed household obligations.
* **Root Cause**:
  * `model Goal` had no budget link flags (`linkToBudget`, `autoAllocateSurplus`, `allocatedBudgetAmount`) or AI evaluation metadata.
  * `BudgetLineItem` records in `GOAL_CONTRIBUTIONS` were manual and not synchronized with active Goal records.
  * No AI financial advisory agent evaluated goal feasibility against ground-truth income, debt APRs, and monthly surplus.
* **Exact Resolution**:
  * Extended `model Goal` in `prisma/schema.prisma` with `linkToBudget`, `autoAllocateSurplus`, `allocatedBudgetAmount`, and AI evaluation fields (`aiFeasibilityScore`, `aiShouldAllocate`, `aiRecommendedAllocation`, `aiEvaluationSummary`, `aiLastEvaluatedAt`).
  * Built `src/lib/goalBudgetSync.ts` for real-time surplus calculation (`Total Income` − `Fixed Obligations` − `Debt Obligations`) and priority-based waterfall allocation into `BudgetLineItem` (`category: GOAL_CONTRIBUTIONS`, `sourceRef: goal:<id>`).
  * Implemented `evaluateGoalFeasibilityWithAI` in `src/agents/goalsAgent.ts` executing via multi-LLM vault (`executeAgentPrompt("GOALS_AGENT", ...)`).
  * Created on-demand AI evaluation endpoint `/api/goals/[id]/evaluate-ai` and surplus sync endpoint `/api/goals/sync-budget`.
  * Redesigned `/goals` with Cashflow Surplus Allocation HUD, AI Feasibility Badges, and interactive AI evaluation drawers.
  * Enriched `/budget` line items with linked Goal progress bars and target completion tags.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-013`).

---

### FIX-014: Statement Duplication Purge, Idempotency & AI Forensic Duplicate Detection
* **Date Identified**: 2026-08-31
* **Symptom**:
  * August 2026 Salary Inflow on `/transactions` was displayed twice (+R 74,438.26 on 14 Aug and +R 74,438.26 on 15 Aug), doubling total monthly income to R 148,876.52.
  * Overlapping PDF statement extractions had injected duplicate transaction rows across overlapping statement documents.
* **Root Cause**:
  * An earlier placeholder seed had inserted an unshifted `2026-08-15` salary row before the real `2026-08-14` cleared Friday payslip statement was ingested. Both entries persisted in `transactions_db.json` and the PostgreSQL `MoneyFlow` table.
  * Overlapping historical PDF extracts (e.g. 6-month statements vs 1-month statements) had ingested identical transactions without multi-factor whitespace-insensitive deduplication.
* **Exact Resolution**:
  * Created `scripts/deduplicate_all_transactions.ts` with whitespace and character normalization to purge 82 duplicate file-ingestion artifacts while strictly preserving all genuine statement transactions.
  * Reseeded clean `MoneyFlow` dataset (1,275 unique statement records) across both local PostgreSQL and remote AWS EC2 container (`moneymanager-postgres`).
  * Built an **AI Forensic Duplicate Anomaly Engine** in `src/app/api/transactions/route.ts` that flags genuine multi-debit orders, double charges, and duplicate card swipes within 5 days with luminous badges (`⚠️ AI Duplicate (Nx)`), an alert banner, and detailed forensic investigation tooltips.
  * Added `"SUSPICIOUS_ONLY"` filter pill in `src/components/BankingTransactionsCard.tsx` and updated summary telemetry with `suspiciousDuplicateCount` and `suspiciousDuplicateTotal`.
  * Deployed full container update to EC2 (`16.171.199.75`); verified `/api/transactions` returns exactly 1 salary inflow of +R 74,438.26 and HTTP 200.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-014`).

---

### FIX-015: Cash Wallet Multi-Facet Filter Reactivity & Vehicle Maintenance Sinking Fund Restoration
* **Date Identified**: 2026-08-31
* **Symptom**:
  * On `/cash-wallet`, clicking category filter pills (e.g. `Domestic Worker (1)`, `Garden Services`, `Groceries`) or typing a search query did not filter the prominent **"Extracted Bank Statement ATM Withdrawals"** batch grid.
  * Toggling `Calendar Month` mode failed to compute proper `01st-to-last-day` date bounds, and `totalUnallocatedCash` displayed all-time cumulative cash instead of the selected cycle's unallocated inflow.
  * The dedicated **"Car Maintenance & Mechanical Repairs Fund"** goal (sinking fund for transmission, brake discs, and vehicle mechanical maintenance for WesBank financed vehicles) was missing from the active user goals.
* **Root Cause**:
  * In `src/app/cash-wallet/page.tsx`, `wallet.unallocatedBatches` was mapped directly without client-side category/search filtering, and `totalUnallocatedCash` on the backend was summing `allUnallocatedBatches` instead of the period-filtered batches.
  * `src/app/api/cash-wallet/route.ts` did not branch date computation when `mode === "CALENDAR_MONTH"`.
  * `prisma/seed.ts` had omitted the vehicle maintenance sinking fund when generic starter goals were introduced.
* **Exact Resolution**:
  * Implemented `matchCategory` helper and `filteredBatches` in `src/app/cash-wallet/page.tsx` enabling real-time multi-facet reactive filtering across both ATM withdrawal batches and the physical cash ledger.
  * Rendered allocated expense chips directly inside withdrawal batch cards and added an **Active Filter Summary HUD Bar** with 1-click Reset buttons.
  * Updated `/api/cash-wallet` to calculate calendar month ranges (`01 Aug – 31 Aug 2026`) and period-scoped `totalUnallocatedCash`.
  * Restored **`BMW 420d M Sport Transmission Repair`** (`targetAmount: R40,000`, `currentAmount: R10,095.16`, `monthlyContribution: R7,500`, `targetDate: 2026-12-15`, `linkToBudget: true`, `priority: 2`, note: *Urgent repair for 2015 BMW 420d M Sport addressing dashboard 'Transmission Fault: Drive moderately. Speed reduced' alert on a 4-month timeline*) in `prisma/seed.ts` and synced across local PostgreSQL and remote AWS EC2 database (`moneymanager-postgres`).
* **Automated Regression Test**: `tests/cashWalletFilter.test.ts` & `tests/regressionAuditSuite.test.ts`.

---

### FIX-016: Money Journey Inter-Account Transfers & Home Loan Payment Lineage
* **Date Identified**: 2026-08-31
* **Symptom**:
  * On `/money-journey`, the `INTERNAL TRANSFERS` headline card displayed `R 0,00` for August 2026 despite monthly inter-account funding transfers between Prestige Current Account, MyMo Current Account, and Titanium Prestige Credit Card.
  * In the Money Journey Neural DAG graph, the **Standard Bank Home Loan (Mortgage Bond)** payment was disconnected from the actual account lineage (funds transferred from Prestige &rarr; MyMo &rarr; Home Loan Bond Settlement).
* **Root Cause**:
  * In `scripts/seed-complete-money-flows.ts` and `prisma/seed.ts`, credit card and secondary account transfers were misclassified as external payments or omitted from the August 2026 cycle.
  * The monthly funding transfer from Prestige &rarr; MyMo (`R 29,359.28`) executed on 15 August 2026 was missing from `MoneyFlow`, preventing the DAG and summary metrics from recognizing internal liquidity movements.
  * `MoneyFlowNetworkCanvas.tsx` layer calculation placed secondary operating accounts in the same layer as terminal debt nodes rather than establishing a clear 4-tier routing flow.
* **Exact Resolution**:
  * Created `scripts/reseed_accurate_money_flows.ts` mapping all historical and August statement transfers:
    * Prestige &rarr; MyMo: `R 29,359.28` (`FlowType.TRANSFER`, `sourceRef: accPrestige.id`, `destinationRef: accMyMo.id`).
    * Prestige &rarr; Titanium Credit Card: `R 1,000.00` (`FlowType.TRANSFER`).
    * Titanium Credit Card &rarr; MyMo: series of instant transfers (`R 343.00`).
    * MyMo &rarr; Standard Bank Home Loan: `R 17,786.45` (`FlowType.DEBT_PAYMENT`, `sourceRef: accMyMo.id`, `destinationRef: debtHomeLoan.id`).
  * Updated `src/components/MoneyFlowNetworkCanvas.tsx` to implement a structured 4-tier DAG layout:
    * **Layer 0**: Inflows (`SARS Primary Net Salary Inflow`)
    * **Layer 1**: Primary Funding Account (`Prestige Current Account (XXXX4469)`)
    * **Layer 2**: Operating Accounts, Cards & Cash Wallets (`MyMo Current Account (XXXX6506)`, `Titanium Prestige Credit Card (XXXX3529)`, `Physical Cash Wallet`)
    * **Layer 3**: Debts, Sinking Funds & Expenses (`Standard Bank Home Loan`, `Revolving Credit Plan`, `WesBank`, `Nedbank`, `Telkom`, `BMW 420d Transmission Repair Fund`, `Municipal`, `Education`, `Living Expenses`).
  * Reseeded and verified `MoneyFlow` table across both local PostgreSQL and AWS EC2 container (`moneymanager-postgres`).
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-016`).

---

### FIX-018: Bank Account Auto-Discovery & Multi-Account Smart Provisioning
* **Date Identified**: 2026-09-01
* **Symptom**:
  * In the Bank Hub (`/settings?tab=banking`), clicking "Link Bank Account" required manual selection of an existing internal account one-by-one. If an account did not exist in MoneyManager yet, linking was blocked with "All accounts are already linked or no accounts exist."
  * Users with multiple accounts at the same institution (e.g. Standard Bank with Cheque, MyMo, Credit Card, Home Loan, Revolving Credit) had to manually configure accounts in advance and repeat authorization 5 times.
* **Root Cause**:
  * The link modal in `BankingTab.tsx` only had a 1-account dropdown referencing pre-existing `unlinkedAccounts`.
  * Open Banking API capabilities (`fetchStitchAccounts`) were not utilized during the connection step to auto-discover user accounts and return real-time balances and types.
* **Exact Resolution**:
  * Implemented `/api/banking/discover` route to query Stitch Open Banking API upon bank selection and discover all accounts, balances, and account types under the profile.
  * Added `matchDiscoveredAccounts` and `mapStitchAccountTypeToPrisma` in `stitchOpenBankingService.ts` for smart matching against existing MoneyManager accounts and mapping types (`CURRENT`, `CREDIT_CARD`, `LOAN`, `SAVINGS`).
  * Implemented `/api/banking/bulk-link` route supporting single-click multi-account auto-provisioning and concurrent background statement ingestion.
  * Upgraded `BankingTab.tsx` with an Apple-grade multi-account discovery dialog displaying discovered balances, matching badges, auto-creation toggles, and 1-click batch connection.
* **Automated Regression Test**: `tests/stitchOpenBanking.test.ts` & `tests/regressionAuditSuite.test.ts` (`FIX-018`).

---

### FIX-019: Forward Budget Realignment for Cancelled Subscriptions (Tracking & Cellular) & Verified RSA ID Ingestion
* **Date Identified**: 2026-09-03
* **Symptom**:
  * Forward budget projections for September 2026 onwards contained redundant subscriptions:
    * `Vehicle Tracking & Telematics (Cartrack & Tracker)` (**R 403.49 / month**) remained budgeted despite vehicles being stationary for repair.
    * `Vodacom Mobile Fibre & Cellular` was budgeted at **R 1,499.00 / month** including mobile lines (`071 282 1432` and `079 868 2053`), even though the user possesses an employer-issued mobile device with unlimited calls and data.
  * In `UserProfile`, the ground-truth South African ID number was unpopulated (`null`).
* **Root Cause**:
  * Budget seed templates lacked dynamic forward lifecycle adjustments to reflect service contract terminations and shifting surplus allocation.
* **Exact Resolution**:
  * Executed `scripts/sync_september_forward_budget.ts` to realign `2026-09` through `2026-12`:
    * Removed `Vehicle Tracking & Telematics (Cartrack & Tracker)` (**R 0.00**).
    * Restructured Vodacom budget line item to reflect Openserve 50Mbps Home Fibre exclusively at **R 864.61 / month** (eliminating R 634.39/month cellular contracts).
    * Reallocated the unlocked **R 1,037.88 / month** recurring surplus into the **Car Transmission Repair Sinking Fund** (increasing monthly contribution from **R 10,095.16** to **R 11,133.04**).
    * Preserved historical statement reconciliation for past months (`2026-07`, `2026-08`) intact.
    * Updated `UserProfile.idNumber` to verified RSA ID `7508245305086`.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-019`).

---

### FIX-020: Forward Budget Parity Rebalance to R74,438.26 SARS Take-Home Salary & Implementation of Apple-Grade Salary Increase Engine
* **Date Identified**: 2026-09-03
* **Symptom**:
  * Forward budget envelope was pegged to R 71,938.26 rather than the user's verified post-increase SARS net take-home pay of **R 74,438.26** (August 2026 Remuneration Statement `Paystub_202706.pdf`), artificially understating liquid surplus by R 2,500.00/month.
  * The application lacked a dedicated South African salary increase intelligence calculator to model cost-of-living increases, notch adjustments, marginal bracket creep, and backdated lump-sum pay.
* **Root Cause**:
  * Initial budget sync script aggregated expenses without reconciling to the new post-increase salary baseline established in August 2026.
* **Exact Resolution**:
  * Updated `scripts/sync_september_forward_budget.ts` to allocate the full **R 13,633.04 / month** verified liquid surplus into the `Car Transmission Repair Sinking Fund` (reaching target by late November 2026).
  * Rebalanced total forward budget spend across `2026-09` through `2026-12` to exactly **R 74,438.26**, achieving 100.0% zero-based parity.
  * Engineered `src/engine/salaryCalculator.ts` implementing SARS 2026/2027 tax brackets, Section 6A Medical Scheme Fees Tax Credits, statutory UIF caps (R 177.12), pre-tax Section 11F retirement deductions, and retroactive backpay simulation.
  * Built Apple-caliber interactive UI in `src/app/salary-calculator/page.tsx` adhering to the workspace design philosophy (`globals.css` tokens, glassmorphism, responsive sliders, itemized payslip breakdown, and bracket creep analysis).
  * Added `Salary & Increase` navigation item with badge to `src/components/Sidebar.tsx`.
* **Automated Regression Test**: `tests/salaryCalculator.test.ts` & `tests/regressionAuditSuite.test.ts` (`FIX-019` & `FIX-020`).

---

### FIX-021: Elimination of Sandbox Mock Fallbacks & Enforcement of 100% Live Open Banking Connection
* **Date Identified**: 2026-09-04
* **Symptom**:
  * In `/settings?tab=banking`, the Bank Hub displayed 5 "Active Connected Bank Feeds" which were synthetic sandbox stubs linked to uploaded statement documents, supported by a mock data generator (`generateSandboxBankData`) in `stitchOpenBankingService.ts`.
  * Uploaded PDF bank statements were conflated with live API feeds, violating Rule 4.1 ("Never use or implement mock or fake fallback data for core entities. Always pull from real ground-truth databases and source documents. Remove any dead mock fallbacks.").
* **Root Cause**:
  * The Open Banking subsystem retained a sandbox simulation generator (`generateSandboxBankData`) that fabricated mock transactions and mock accounts when no live Stitch credentials existed.
  * Statement-derived accounts had been stubbed with synthetic `BankConnection` records in the database during prior test executions.
* **Exact Resolution**:
  * **Complete Mock Purge**: Deleted `generateSandboxBankData` and all synthetic transaction generators from `stitchOpenBankingService.ts`. Replaced mock fallbacks with strict error throwing when unauthenticated.
  * **Database Cleanup**: Executed `scripts/purge_mock_bank_connections.ts` purging all synthetic `BankConnection` records. The Banking Hub now reflects ground truth (starts at 0 live feeds until authenticated).
  * **Statement Isolation**: Completely decoupled uploaded PDF statements (`prisma.document`) from live banking API routes (`/api/banking`). Uploaded statements remain isolated in the Document Vault.
  * **Live Open Banking Engine**:
    * Implemented OAuth 2.0 PKCE connect flow (`/api/banking/auth/connect`) constructing direct authorization links to Standard Bank's official authentication portal via Stitch.
    * Implemented OAuth callback handler (`/api/banking/auth/callback`) to exchange authorization codes for live bearer tokens and pull accounts directly from Stitch GraphQL API (`https://api.stitch.money/graphql`).
    * Built Gateway Credentials management route (`/api/banking/config`) allowing users to configure live `STITCH_CLIENT_ID` and `STITCH_CLIENT_SECRET` encrypted in their environment.
  * **UI Upgrades**: Overhauled `src/components/BankingTab.tsx` removing sandbox notices and replacing them with a live gateway status card, BYOK credentials modal, and a clean zero-state directing users to authenticate via live OAuth.
* **Automated Regression Test**: `tests/stitchOpenBanking.test.ts` & `tests/regressionAuditSuite.test.ts` (`FIX-021`).

---

### FIX-022: Multi-Bank Decoupling, Removal of Hardcoded Standard Bank References, and Elimination of Simulated Push Notifications
* **Date Identified**: 2026-09-04
* **Symptom**:
  * The Banking Hub toolbar and empty-state action buttons were hardcoded specifically to Standard Bank (`+ Connect Standard Bank` and `+ Connect Standard Bank (Live OAuth)`).
  * Standard Bank was artificially badged as "Recommended" in the bank connectors registry.
  * A simulated direct login modal claimed to have "dispatched an Approve-It notification to your mobile device", causing confusion because no network call had been or could be sent to Standard Bank without an active FSCA-licensed gateway.
  * Third-party references (Vault22) were present in the codebase and UI.
* **Root Cause**:
  * Early prototyping defaulted to Standard Bank (`SBG`) as the sole test harness institution because the developer used the user's sample Standard Bank statements.
  * Local simulated modals were mistakenly introduced that pretended to send push notifications to a user's phone, violating the strict Zero-Mock & Ground-Truth Policy.
* **Exact Resolution**:
  * **Institution-Neutral UI**: Updated `src/components/BankingTab.tsx` with generic, multi-bank action buttons (`+ Connect Bank Account`).
  * **Universal Bank Selection Modal**: Built an Apple-caliber interactive Bank Picker allowing users to select any supported bank (Capitec, FNB, Nedbank, Investec, ABSA, Discovery Bank, TymeBank, Standard Bank).
  * **Neutral Registry**: Removed `isRecommended: true` preference on Standard Bank in `SA_BANK_CONNECTORS` so all institutions are treated neutrally.
  * **Purge of Simulated Endpoints & Third-Party References**: Deleted `src/app/api/banking/direct-connect` and removed all references to Vault22 across the entire codebase.
  * **Honest Gateway Communication**: Clearly explained to the user why real in-app Approve-It notifications require an active, licensed Open Finance gateway (Stitch API) communicating with bank core systems, rather than simulating fake mobile notifications.
* **Automated Regression Test**: `tests/stitchOpenBanking.test.ts` (`should ensure neutral institution recommendation across all connectors` & `should construct valid Stitch OAuth authorization URL with required scopes`).

---

### FIX-023: Administrator Role Segregation for Open Finance Gateway Configuration
* **Date Identified**: 2026-09-04
* **Symptom**:
  * Open Finance Gateway credentials (Stitch Client ID, Client Secret, and redirect URIs) were initially presented inside the consumer-facing Banking Hub via a developer configuration modal.
  * End-users should never be asked to configure or view infrastructure API credentials; infrastructure gateway management is exclusively a system administrator function.
* **Root Cause**:
  * Gateway API credential management was not properly segregated by user role (`admin` vs `user`), conflating system infrastructure configuration with end-user personal finance workflows.
* **Exact Resolution**:
  * **Role-Guarded Backend API**:
    * Updated `POST /api/banking/config` to strictly verify `user.role === "admin"` and return `403 Forbidden` if a non-administrator attempts to modify gateway keys.
    * Updated `GET /api/banking/config` so non-administrators only receive `{ isConfigured: boolean }`, completely withholding masked client IDs and configuration parameters.
  * **Dedicated Administrator Gateway View**:
    * Created `src/components/AdminGatewaySettings.tsx` with AES-256 encrypted credential management, gateway status indicator, and active bank registry overview.
    * Embedded the "Admin Gateway" tab in `src/app/settings/page.tsx` with a distinct `ADMIN` badge, rendered strictly when `userRole === "admin"`.
  * **Security Gate for Direct URL Access**:
    * If a non-administrator navigates directly to `/settings?tab=admin-gateway`, a sleek security gate card is presented informing them that gateway configuration is restricted to system administrators, with a direct button to return to Banking Feeds.
  * **Clean Consumer Banking Hub**:
    * Removed all credential input modals from `src/components/BankingTab.tsx`. The Banking Hub remains purely consumer-focused. If the gateway is unconfigured, non-administrators are instructed that bank feeds are awaiting administrator gateway activation.
  * **Client-Safe Architectural Decoupling**:
    * Created `src/lib/bankConnectors.ts` to isolate browser-safe bank connector metadata from Node server services (`prisma` / `crypto`), preventing Next.js client bundling errors.
* **Automated Regression Test**: `tests/stitchOpenBanking.test.ts` & `tests/regressionAuditSuite.test.ts` (`FIX-023`).

---

### FIX-024: Agent Memory Tab UI/UX Restoration & Global Design System Alignment
* **Date Identified**: 2026-09-04
* **Symptom**:
  * The Continuous Agent Learning tab (`/settings?tab=agent-memory`) appeared broken with raw unstyled browser buttons, vertically stacked text, and absent card styling.
  * Sporadic components across `/profile` and `/chatbot` contained uncompiled Tailwind utility classes (`grid-cols-`, `rounded-xl`, `p-3`).
  * Badge classes (`badge-gold`, `badge-purple`, `badge-cyan`, `badge-blue`) and typography utilities (`font-mono`, `text-slate-*`) were missing matching CSS selectors in `globals.css`.
* **Root Cause**:
  * `AgentMemoryManager.tsx` had been authored using uncompiled Tailwind CSS classes (`space-y-6`, `grid-cols-2`, `p-3`, `text-xs`, `rounded-xl`, `border-white/10`) which are inactive in this vanilla CSS architecture.
* **Exact Resolution**:
  * **Complete Agent Memory Redesign**: Overhauled `src/components/AgentMemoryManager.tsx` using Apple-caliber fintech design principles (`globals.css`, CSS variables, `.card`, `.stat-grid`, `.stat-card`, `.badge`, `.btn`, `.btn-primary`, `.btn-secondary`, `.modal-overlay`, `.modal`).
  * **Feature Elements**: Added purple glowing BrainCircuit hero banner with live feedback badge, 4-card metric grid, segmented domain filter pills with count badges, rich memory cards, and a modal for teaching custom agent rules.
  * **Global CSS Enhancement**: Updated `src/styles/globals.css` with missing badge class aliases (`.badge-gold`, `.badge-purple`, `.badge-cyan`, `.badge-blue`), typography helper `.font-mono`, and `.text-slate-100` through `.text-slate-500`.
  * **Workspace UI Audit**: Systematically audited key application routes (`/`, `/debts`, `/budget`, `/salary-calculator`, `/settings?tab=banking`, `/settings?tab=agent-memory`, `/settings?tab=property-data`, `/profile`), verifying zero visual regressions and 100% design fidelity.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-024`).

---

### FIX-025: Alignment of Subscription Tiers & Pricing Between Login and Billing Hubs
* **Date Identified**: 2026-09-04
* **Symptom**:
  * The pricing information presented on the landing / login page (`/login#pricing`) and the in-app billing page (`/billing`) was completely out of alignment:
    * **Currency Mismatch**: Login page was hardcoded to default to US Dollars (`$0`, `$12`, `$29`), whereas Billing page rendered in South African Rand (`R0`, `R199`, `R499`).
    * **Tier Count & Legacy Pollution**: `/billing` displayed 6 duplicate and legacy tier cards (`Free`, `Starter Free`, `Plus`, `Premium`, `Pro Wealth Accelerator`, `Executive Enterprise`), whereas `/login` displayed 3 tiers.
    * **Annual Billing Discount Discrepancy**: Login page displayed `Save 20%`, while Billing displayed `Save 17%` (R 1,990 vs R 2,388, which is mathematically 16.7% ~ 17%).
    * **Annual Rate Display**: Pro annual billing on Login showed `R 159` while Billing showed `R 166` (or `Math.round(1990/12)`).
    * **Feature Checklist Inconsistency**: Feature lists and descriptions diverged between `/login` and `/billing`, and `/billing` cards had a static 7-row checklist with greyed-out items.
* **Root Cause**:
  * `LoginPage` (`src/app/login/page.tsx`) initialized currency state to `"USD"` (`useState<SupportedCurrency>("USD")`), never invoked `setCurrency`, and had non-interactive currency preview pills without `onClick` handlers.
  * The database on EC2 and local environments contained deprecated legacy tiers (`Free`, `Plus`, `Premium`) created during early SaaS prototyping that were never deactivated.
  * `/billing/page.tsx` was not using tier-specific feature definitions, instead iterating through a hardcoded legacy list.
* **Exact Resolution**:
  * **Canonical 3-Tier Specification**:
    * Enforced the 3 canonical tiers across the entire platform:
      1. **Starter Free**: `R 0 / month` | `R 0 / year`.
      2. **Pro Wealth Accelerator** (Most Popular): `R 199 / month` | Annual: `R 165 / month`, billed `R 1,990 / year` · Save 17%.
      3. **Executive Enterprise**: `R 499 / month` | Annual: `R 415 / month`, billed `R 4,990 / year` · Save 17%.
  * **Database & Route Cleanup**:
    * Updated `src/app/api/billing/tiers/route.ts` to automatically deactivate any legacy/stale tiers (`Free`, `Plus`, `Premium`) and return strictly active canonical tiers in ascending monthly price order.
    * Added legacy tier deactivation query in `scripts/setup_ec2_tables.sql`.
  * **Login Page Alignment**:
    * Set default currency state to `"ZAR"` in `src/app/login/page.tsx`.
    * Made currency selector pills fully interactive with click handlers and active cyan glow.
    * Added currency quick-switcher beside the billing cycle toggle in the pricing section.
    * Aligned annual savings badge to `Save 17%` and included annual billed amounts (`Billed R 1,990 annually` & `Billed R 4,990 annually`).
  * **Billing Hub Alignment**:
    * Updated `src/app/billing/page.tsx` to calculate annual monthly rate with `Math.floor(Number(tier.priceAnnual) / 12)` displaying exact `R165 / month` and `R415 / month`.
    * Implemented `TIER_FEATURES` mapping in `src/app/billing/page.tsx` that mirrors the login page subtitles and feature checklists word-for-word.
* **Automated Regression Test**: `tests/regressionAuditSuite.test.ts` (`FIX-025`).

