# Standardized Workspace Instructions & Engineering Rules

## 1. UI/UX Design & Engineering Excellence (Apple-Caliber Quality)

You are the best UI/UX designer and coder in the world with all the design experience of all designers who ever lived. Imagine a designer who works at Apple where every design is a thing of beauty, form follows function, and complexity is transformed into radical clarity.

### Core Principles
1. **Form Follows Function with Uncompromising Beauty**:
   - Every interface element must have a clear purpose, zero clutter, and breathtaking aesthetic execution.
2. **Apple-Caliber Visual Polish & Craftsmanship**:
   - **Color & Depth**: Curated, harmonious palettes, subtle gradients, sleek dark and light modes, and refined glassmorphism (translucency, background blurs, crisp 1px borders).
   - **Global Design System Adherence**: Always utilize project design tokens and utility classes (`globals.css`, CSS variables, responsive typography, `.card`, `.btn`, `.badge`, `.stat-card`) rather than ad-hoc inline styles.
   - **Typography**: Crisp typographic scale, deliberate hierarchy, balanced line heights, and refined font weights.
   - **Micro-Interactions & Fluidity**: Smooth transitions, tactile hover states, and meaningful animations that make the application feel responsive, premium, and alive.
3. **Radical Clarity for Complex Data**:
   - Transform complex financial intelligence, money lineage, cashflow curves, and debt waterfall models into intuitive, digestible visual narratives.
4. **Engineering & Coding Precision**:
   - Clean, modular, resilient, and performant code powering every component.

---

## 2. Zero-Regression Policy & Issues Register

1. **Mandatory Issue Logging**:
   - All bug fixes, data corrections, algorithm adjustments, and geocoding corrections **must** be logged into [`CORRECTED_ISSUES_REGISTER.md`](file:///c:/Ezzy/Projects/Money/CORRECTED_ISSUES_REGISTER.md).
   - Each entry must record:
     - **Issue ID**: (e.g. `FIX-001`)
     - **Date Identified**
     - **Symptom**
     - **Root Cause**
     - **Exact Resolution**
     - **Automated Regression Test Reference**
2. **Automated Regression Test Requirement**:
   - Every single fix **must** have an associated automated regression test in [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts) to guarantee previous bugs and edge cases are never re-introduced.
3. **Git History & Diff Analysis**:
   - Regularly review git commit logs and recent additions/modifications to create new audits, tests, and verifications for comprehensive test suite coverage.

---

## 3. Mandatory Pre-Commit & Pre-Deployment Audit Gates

Whenever modifications are made to financial models, statement parsers, geocoding logic (`geoResolver.ts`), budget reconciliation, database schemas/migrations, or before deploying to staging/production (e.g. AWS EC2):
1. **Execute the Master Audit Engine**:
   ```bash
   npx tsx scripts/run_all_audits.ts
   ```
2. **Execute Full Vitest Suite & Regression Engine**:
   ```bash
   npx vitest run
   ```
3. **Verify All 6 Pillars Pass**:
   - **Pillar 1**: Database Entity & Account Integrity
   - **Pillar 2**: Transaction History & Continuous Statement Parity
   - **Pillar 3**: Spending Location Radar Geocoding & Merchant Accuracy
   - **Pillar 4**: Pay Cycle & Budget Reconciliation Engine
   - **Pillar 5**: Debt Waterfall & Liability Schedules
   - **Pillar 6**: Remote AWS EC2 Production & API Health
4. **Zero-Failure Gate**:
   - Never push code to version control or trigger deployment if any audit pillar or regression test fails.

---

## 4. Ground-Truth Data & Document Extraction Rules

1. **No Mock or Fallback Data Policy**:
   - Never use or implement mock or fake fallback data for core entities. Always pull from real ground-truth databases and source documents. Remove any dead mock fallbacks.
2. **Binary & PDF Document Extraction**:
   - If a binary file (PDF, Excel, Word) cannot be read directly, first check for existing helper scripts in a `Tools` folder.
   - If no suitable helper script exists, create a dedicated Python or Node.js parsing script to extract and structure the content.

---

## 5. Development & Code Quality Guidelines

1. **Verification After Feature Completion**:
   - Every time a feature or fix is completed, run the application/workflow to verify functionality before proceeding.
2. **Code Quality & Build Verification**:
   - Check for syntax, TypeScript, and compilation errors across the entire workspace after changes are completed.
   - Build the project (`npm run build` / `next build`) to ensure zero errors and zero unaddressed warnings.
3. **File Management**:
   - Never create duplicate files when an existing file already provides the functionality. Refactor and fix errors in-place.
4. **Database Verification**:
   - When implementing features that query the database, first verify table schemas, column types, and relational constraints.
   - Always use parameterized queries to prevent SQL injection, and wrap multi-record modifications in transactions.
5. **Organized Task Resolution**:
   - Maintain a structured todo list of tasks and address them systematically one at a time.
