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
  * Probes `/api/dashboard`, `/api/budget`, `/api/documents`, `/api/banking`, and `/api/entities` for HTTP 200 responses.
  * Asserts full spending radar JSON payload rendering on live production environment.

---

## ⚡ Mandatory Execution Governance Rule

> [!IMPORTANT]
> **Pre-Deployment & Change Rule**:
> Every time changes are made to data parsers, database schemas, budget models, or spending radar engines, you **MUST** run:
> ```bash
> npx tsx scripts/run_all_audits.ts
> npx vitest run
> ```
> Deployment to EC2 via `scripts/deploy_full_to_ec2.py` will automatically enforce these audits and abort if any pillar fails.
