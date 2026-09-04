# MoneyManager Comprehensive Audits Inventory & Governance Protocol

This document maintains an immutable index of all audits, verification suites, and integrity checks implemented across MoneyManager. All audits are wired into the automated master runner: [`scripts/run_all_audits.ts`](file:///c:/Ezzy/Projects/Money/scripts/run_all_audits.ts).

---

## 🏛️ Master Audit Pillars

### 1. Pillar 1: Database Schema, Users & Account Entity Integrity
* **Runner / Script**: [`scripts/run_all_audits.ts`](file:///c:/Ezzy/Projects/Money/scripts/run_all_audits.ts) (Pillar 1)
* **Underlying Scripts**: [`scripts/audit_ec2_live_data.py`](file:///c:/Ezzy/Projects/Money/scripts/audit_ec2_live_data.py), [`scripts/find-user.ts`](file:///c:/Ezzy/Projects/Money/scripts/find-user.ts)
* **Scope & Invariants**:
  * Verifies primary user (`mokhotm`) and household profile (`mokhotb`).
  * Confirms 14 active accounts across Standard Bank (Prestige Current, MyMo, Credit Card, Home Loan, Revolving Loan), WesBank (Renault Clio, Hyundai Grand i10), Nedbank, City of Ekurhuleni, Telkom, School/University fees, and Cash Wallet.
  * Ensures zero orphaned foreign key records.

---

### 2. Pillar 2: Raw Statement Extraction & MoneyFlow Continuity
* **Runner / Script**: [`scripts/audit_artifacts_statements.py`](file:///c:/Ezzy/Projects/Money/scripts/audit_artifacts_statements.py), [`scripts/deep_audit_all_statements.py`](file:///c:/Ezzy/Projects/Money/scripts/deep_audit_all_statements.py)
* **Underlying Scripts**: [`scripts/audit_source_data.js`](file:///c:/Ezzy/Projects/Money/scripts/audit_source_data.js), [`scripts/audit_money_flows.js`](file:///c:/Ezzy/Projects/Money/scripts/audit_money_flows.js)
* **Scope & Invariants**:
  * Cross-references raw PDF statements in [`Artifacts/`](file:///c:/Ezzy/Projects/Money/Artifacts) against PostgreSQL `MoneyFlow` and `Document` records.
  * Verifies all 1,360 continuous transaction records dating from January 2026 to August 2026.
  * Validates reversal and bounce offsetting (`RTD`, `REVERSAL`, `UNPAID`, `FEE - POS DECLINED`).

---

### 3. Pillar 3: Spending Location Radar & South African Geocoding Intelligence
* **Runner / Script**: [`audit_locations.ts`](file:///c:/Ezzy/Projects/Money/audit_locations.ts), [`tests/spendingLocationRadar.test.ts`](file:///c:/Ezzy/Projects/Money/tests/spendingLocationRadar.test.ts)
* **Underlying Scripts**: [`scripts/find_unclassified_merchants.ts`](file:///c:/Ezzy/Projects/Money/scripts/find_unclassified_merchants.ts), [`scripts/find_top_unmatched.ts`](file:///c:/Ezzy/Projects/Money/scripts/find_top_unmatched.ts)
* **Artifact Output**: [`location_audit_report.json`](file:///c:/Ezzy/Projects/Money/location_audit_report.json), [`merchant_overrides.json`](file:///c:/Ezzy/Projects/Money/merchant_overrides.json)
* **Scope & Invariants**:
  * Resolves 86+ physical store locations with accurate coordinates across Springs & Bakerton, Pretoria & Centurion, East Rand (Benoni, Boksburg, Brakpan, Tsakane, Bapsfontein), Johannesburg Metro, Bloemfontein, and National transit corridors.
  * Separates digital subscriptions (Netflix, Spotify, Google, OpenAI, Showmax), utilities (Prepaid Electricity, Mobile Airtime/Data), vehicle telematics (Cartrack), and Standard Bank account fees.
  * Enforces accurate salary pay cycle bounds (15th-to-15th business-day adjusted).

---

### 4. Pillar 4: Salary Cycle & Budget Reconciliation Engine
* **Runner / Script**: [`scripts/audit_budget_vs_transactions.js`](file:///c:/Ezzy/Projects/Money/scripts/audit_budget_vs_transactions.js), [`scripts/comprehensive_budget_transaction_audit.js`](file:///c:/Ezzy/Projects/Money/scripts/comprehensive_budget_transaction_audit.js)
* **Underlying Library**: [`src/lib/budgetReconciliation.ts`](file:///c:/Ezzy/Projects/Money/src/lib/budgetReconciliation.ts)
* **Scope & Invariants**:
  * Reconciles monthly budget line items against actual debit orders, electronic fund transfers (EFT), cash wallet allocations, and PayShap transactions.
  * Detects combined multi-item debit deductions (e.g. combined Home Loan / Revolving Loan debit orders).
  * Validates August 2026 cycle execution ($> 70\%$ cleared on live statement data).

---

### 5. Pillar 5: Debt Waterfall & Liability Schedule Integrity
* **Runner / Script**: [`tests/debtEngine.test.ts`](file:///c:/Ezzy/Projects/Money/tests/debtEngine.test.ts)
* **Underlying Scripts**: [`scripts/find-homeloan-and-budget.ts`](file:///c:/Ezzy/Projects/Money/scripts/find-homeloan-and-budget.ts)
* **Scope & Invariants**:
  * Audits 10 debt instruments totaling ~R 2.46M in principal liabilities.
  * Validates Snowball vs. Avalanche amortization schedules and interest rates.
  * Verifies minimum monthly debt service obligations.

---

### 6. Pillar 6: Remote AWS EC2 Production & API Health Verification
* **Runner / Script**: [`scripts/test_ec2_live_radar_api.js`](file:///c:/Ezzy/Projects/Money/scripts/test_ec2_live_radar_api.js), [`scripts/test_ec2_live_budget.js`](file:///c:/Ezzy/Projects/Money/scripts/test_ec2_live_budget.js)
* **Underlying Scripts**: [`scripts/test_all_apis.js`](file:///c:/Ezzy/Projects/Money/scripts/test_all_apis.js), [`scripts/test_ec2_auth.js`](file:///c:/Ezzy/Projects/Money/scripts/test_ec2_auth.js)
* **Scope & Invariants**:
  * Authenticates live sessions on EC2 instance (`16.171.199.75`).
  * Probes `/api/dashboard`, `/api/budget`, `/api/documents`, `/api/banking`, `/api/goals`, and `/api/entities` for HTTP 200 responses.
  * Asserts full spending radar JSON payload rendering on live production environment.

---

---

### 7. Pillar 7: Dynamic Goal-to-Budget Linking & AI Feasibility Engine
* **Runner / Script**: [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts) (`FIX-013`)
* **Underlying Libraries**: [`src/lib/goalBudgetSync.ts`](file:///c:/Ezzy/Projects/Money/src/lib/goalBudgetSync.ts), [`src/agents/goalsAgent.ts`](file:///c:/Ezzy/Projects/Money/src/agents/goalsAgent.ts)
* **Scope & Invariants**:
  * Calculates real-time available monthly cashflow surplus (`Total Net Salary` − `Fixed Obligations` − `Debt Servicing Minimums`).
  * Validates priority-based waterfall allocation into `BudgetLineItem` under `category: GOAL_CONTRIBUTIONS` with `sourceRef: goal:<id>`.
  * Verifies AI multi-agent feasibility scoring (0–100), safe monthly allocation recommendations, and risk warnings.

---

### 8. Pillar 8: Open Banking, Administrator Gateway & Multi-Bank Neutrality Protocol
* **Runner / Script**: [`tests/stitchOpenBanking.test.ts`](file:///c:/Ezzy/Projects/Money/tests/stitchOpenBanking.test.ts), [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts) (`FIX-021`, `FIX-022`, `FIX-023`)
* **Underlying Services**: [`src/services/stitchOpenBankingService.ts`](file:///c:/Ezzy/Projects/Money/src/services/stitchOpenBankingService.ts), [`src/lib/bankConnectors.ts`](file:///c:/Ezzy/Projects/Money/src/lib/bankConnectors.ts), [`src/app/api/banking/config/route.ts`](file:///c:/Ezzy/Projects/Money/src/app/api/banking/config/route.ts)
* **Scope & Invariants**:
  * **Zero-Mock Policy (`FIX-021`)**: Strictly prohibits synthetic fallback data, mock account stubs, and sandbox simulation loops. Requires live Stitch OAuth 2.0 PKCE authentication for account stream ingestion.
  * **Multi-Bank Neutrality (`FIX-022`)**: Enforces equal, unbiased representation across all 8 major South African commercial institutions (Standard Bank, Capitec, FNB, Nedbank, Investec, Absa, Discovery Bank, TymeBank). Eradicates proprietary third-party lock-ins.
  * **Administrator Role Segregation (`FIX-023`)**: Strictly protects B2B gateway configuration routes (`/api/banking/config`), returning `403 Forbidden` for non-administrators. Isolate gateway key entry to `/settings?tab=admin-gateway` exclusively for `role === "admin"`.

---

### 9. Pillar 9: Global UI/UX Design System & Continuous Multi-Agent Learning Invariant
* **Runner / Script**: [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts) (`FIX-024`)
* **Underlying Components**: [`src/components/AgentMemoryManager.tsx`](file:///c:/Ezzy/Projects/Money/src/components/AgentMemoryManager.tsx), [`src/styles/globals.css`](file:///c:/Ezzy/Projects/Money/src/styles/globals.css)
* **Scope & Invariants**:
  * **Zero Dead CSS Selectors**: Ensures no uncompiled utility classes (Tailwind remnants) exist across application views. All visual components must strictly adhere to the obsidian design system (`globals.css`, CSS variables, `.card`, `.stat-card`, `.badge`, `.btn`).
  * **Badge & Typography Tokens**: Ensures composite badge styles (`.badge-gold`, `.badge-purple`, `.badge-green`, `.badge-cyan`) and font helpers (`.font-mono`, `.text-slate-*`) are defined and consistent.
  * **Memory Feedback Flywheel**: Inspects the 6 specialized agent memory domains (`GEO`, `BUDGET`, `DEBT`, `GOALS`, `DOCUMENT`, `PREFERENCE`), ensuring custom rules and learned corrections are seamlessly fed into LLM prompts via `getPromptAugmentationMemories`.

---

## 🧪 Comprehensive Automated Regression Audits Index (`tests/regressionAuditSuite.test.ts`)

MoneyManager maintains **21 automated regression tests** executing under Vitest to guarantee that previously corrected edge cases never regress:

| Issue ID | Domain / Component | Description of Automated Regression Assertion |
| :--- | :--- | :--- |
| **`FIX-001`** | `geoResolver.ts` | Asserts "Shell Middelstraat" resolves to Pretoria (Nieuw Muckleneuk) and never Middelburg, Mpumalanga. |
| **`FIX-002`** | `geoResolver.ts` | Asserts South African retail merchant rules directory contains $\ge 80$ comprehensive retail hub definitions. |
| **`FIX-003`** | `geoResolver.ts` | Asserts bank fees, airtime, and PayShap P2P transactions are classified as Digital Services (not physical venues). |
| **`FIX-004`** | `geoResolver.ts` | Asserts Springs & Bakerton coordinates fall within strict geographic bounding boxes ($< 15\text{km}$ radius). |
| **`FIX-005`** | `emailStatementParser.ts` | Asserts automated inbound classifier accurately identifies top 8 South African financial institutions. |
| **`FIX-006`** | `moneyFlows.ts` | Asserts reversal (`RTD`, `REVERSAL`, `UNPAID`) offsetting parity prevents double-counting outflows. |
| **`FIX-007`** | `payrollCalendar.ts` | Asserts 15th-to-15th salary cycle calculation shifts Friday/Monday for weekends and adjusts for holidays. |
| **`FIX-008`** | `budgetReconciliation.ts` | Asserts deterministic budget execution speeds ($< 3000\text{ms}$ cold, $< 100\text{ms}$ warm). |
| **`FIX-009`** | `geoResolver.ts` | Asserts category taxonomy adheres to the 5 core budget groups without generic fallback labels. |
| **`FIX-010`** | `debtEngine.ts` | Asserts Snowball & Avalanche amortization cascades match SARB prime rate formulas across all 10 debt accounts. |
| **`FIX-011`** | `prisma/schema.prisma` | Asserts user profiles, entities, and account records maintain referential integrity without orphan records. |
| **`FIX-012`** | `BankingTab.tsx` | Asserts Bank Feeds components and Stitch services are modular, exportable, and client-safe. |
| **`FIX-013`** | `goalBudgetSync.ts` | Asserts surplus waterfall calculation safely links priority goals to active budget line items. |
| **`FIX-014`** | `cashWalletService.ts` | Asserts ATM withdrawal regex accurately captures parent withdrawal flows for cash batching. |
| **`FIX-015`** | `cashWalletService.ts` | Asserts parent-child cash splits reconcile accurately and eliminate phantom cash leakage from reports. |
| **`FIX-016`** | `src/lib/encryption.ts` | Asserts AES-256-CBC encryption vault securely encrypts and decrypts BYOK LLM provider keys. |
| **`FIX-017`** | `cashflowEngine.ts` | Asserts 365-day balance projection maintains cash continuity without unexplained variance. |
| **`FIX-018`** | `src/lib/taxEngine.ts` | Asserts SARS ITR12 tax deduction calculations enforce Section 11F (27.5%) and TFSA (R36k) ceilings. |
| **`FIX-019`** | `sync_september_forward_budget.ts` | Asserts forward budget alignment reflects Openserve Fibre (R 864.61) and verified RSA ID format. |
| **`FIX-020`** | `salaryCalculator.ts` | Asserts post-increase salary envelope of R 74,438.26 matches itemized statutory payslip calculations. |
| **`FIX-021`** | `stitchOpenBankingService.ts` | Asserts strict prohibition of mock fallbacks and guarantees 0 synthetic connections in database. |
| **`FIX-022`** | `bankConnectors.ts` | Asserts neutral representation across all 8 major SA banks without proprietary third-party lock-ins. |
| **`FIX-023`** | `api/banking/config/route.ts` | Asserts administrator role segregation gates B2B credentials with `403 Forbidden` for non-admins. |
| **`FIX-024`** | `AgentMemoryManager.tsx` | Asserts obsidian design system adherence and zero uncompiled utility classes in Agent Memory tab. |

---

## ⚡ Mandatory Execution Governance Rule

> [!IMPORTANT]
> **Pre-Deployment & Change Rule**:
> Every time changes are made to data parsers, database schemas, budget models, goals, open banking, or spending radar engines, you **MUST** run:
> ```bash
> npx.cmd tsx scripts/run_all_audits.ts
> npx.cmd vitest run
> ```
> Deployment to EC2 via `scripts/deploy_full_to_ec2.py` will automatically enforce these audits and abort if any pillar fails.
