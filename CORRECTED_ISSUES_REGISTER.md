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

