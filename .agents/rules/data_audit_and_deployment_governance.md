# Data Audit & Pre-Deployment Governance Rules

## Mandatory Execution Protocol
Every time any data parsing, database migrations, merchant location rules, budget calculations, or software changes are performed, you **MUST** run the automated audits and regression suite before git commit and before AWS EC2 deployment:

```bash
npx tsx scripts/run_all_audits.ts
npx vitest run
```

## The 6 Core Audit Pillars
1. **Pillar 1: Database Entity & Account Integrity** — Verifies primary accounts, users, and relationships with zero orphan entities.
2. **Pillar 2: Transaction History & Continuous Statement Parity** — Validates 1,360+ statement flows from bank PDFs, accurately handling reversals.
3. **Pillar 3: Spending Location Radar Geocoding & Merchant Accuracy** — Ensures 86+ physical merchants across South African economic nodes (Springs, Pretoria, Centurion, East Rand, Joburg) with exact GPS and clean classification.
4. **Pillar 4: Pay Cycle & Budget Reconciliation Engine** — Validates monthly budget execution against statement debit orders and EFTs.
5. **Pillar 5: Debt Waterfall & Liability Schedules** — Confirms amortization, interest rates, and cascade payoff progress for all 10 debt instruments.
6. **Pillar 6: Remote AWS EC2 Production & API Health** — Executes live smoke tests and authenticated API probes against the EC2 instance.

## Corrected Issues Register & Zero-Regression Policy
- **Mandatory Issue Logging**: All bug fixes, geocoding adjustments, and schema enhancements must be documented in [`CORRECTED_ISSUES_REGISTER.md`](file:///c:/Ezzy/Projects/Money/CORRECTED_ISSUES_REGISTER.md).
- **Automated Regression Suite**: Every fix must have an explicit automated test case in [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts).
- **Deployment Gate**: Deployment scripts (`scripts/deploy_full_to_ec2.py`) must halt and fail immediately if any audit pillar or regression test reports a failure.
