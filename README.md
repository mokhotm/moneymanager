# MoneyManager — Enterprise Wealth & Financial Intelligence Platform

An enterprise-grade personal finance, wealth intelligence, money lineage, multi-agent AI copilot, and debt waterfall acceleration platform engineered with **Next.js 16**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Lucide React**, and **Recharts**.

Built with an **Apple-grade Obsidian Glass design philosophy** (`backdrop-filter: blur(24px)`), radical clarity for complex financial data, and tailored for **South African statutory payroll and banking realities (ZAR / Rand)**.

---

## 🌟 Core Architecture & Key Features

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                MONEYMANAGER PLATFORM                                   │
├───────────────────┬───────────────────┬───────────────────┬────────────────────────────┤
│  PAYROLL CALENDAR │  BANKING & BUDGET │   MONEY JOURNEY   │  FINANCIAL INTELLIGENCE    │
│      ENGINE       │  TRANSACTION FEED │   NEURAL CANVAS   │       & LEAKAGE HUB        │
├───────────────────┼───────────────────┼───────────────────┼────────────────────────────┤
│ • Saturday->Friday│ • Glowing Halos   │ • 4-Layer DAG Map │ • Dynamic Verified Salary  │
│ • Sunday->Monday  │ • Category Stripes│ • Auto-Fit View   │ • 30-Day Cash Runway       │
│ • Holiday Shifts  │ • 1-Click Mapping │ • Expandable View │ • Friction & Leakage Radar │
│ • Statement Sync  │ • Live KPI Sync   │ • Mask GPU Clip   │ • 6-Month Trajectory Graph │
└───────────────────┴───────────────────┴───────────────────┴────────────────────────────┘
```

---

### 1. South African Statutory Payroll & Business Day Adjustment Engine (`src/lib/payrollCalendar.ts`)
- **Statutory South African Payroll Shift Rules**:
  - **Saturday Rule**: If the 15th falls on a **Saturday**, salary is paid on the preceding **Friday 14th** (`day - 1`).
  - **Sunday Rule**: If the 15th falls on a **Sunday**, salary is paid on the following **Monday 16th** (`day + 1`).
  - **Public Holiday Rule**: If the pay date lands on a statutory public holiday (or a Sunday holiday observed on Monday), the engine automatically shifts the pay date to the **preceding business day before the holiday** (avoiding weekends).
- **Automated Bank Statement Salary Synchronization**:
  - Automatically queries bank transactions for verified salary deposits (`SARS Net Salary Deposit`, `SALARY`, `PAYROLL`, `REMUNERATION`, or inflows $\ge$ R50,000) to anchor the ground-truth pay date directly from cleared bank statements.
- **Universal Pay Cycle Range Helper (`resolveSalaryCycleRange`)**:
  - Centralized engine calculating exact UTC boundaries and human-readable labels across all 2026 months:
    - **August 2026**: `14 Aug – 14 Sep 2026` *(Shifted from Sat 15 Aug to Fri 14 Aug)*
    - **July 2026**: `15 Jul – 13 Aug 2026`
    - **June 2026**: `15 Jun – 14 Jul 2026`
    - **May 2026**: `15 May – 14 Jun 2026`
    - **April 2026**: `15 Apr – 14 May 2026`
    - **March 2026**: `16 Mar – 14 Apr 2026` *(Shifted from Sun 15 Mar to Mon 16 Mar)*
    - **February 2026**: `16 Feb – 15 Mar 2026` *(Shifted from Sun 15 Feb to Mon 16 Feb)*
    - **January 2026**: `15 Jan – 15 Feb 2026`

---

### 2. Live Banking Transactions & Intelligent Budget Integration (`BankingTransactionsCard.tsx`, `/transactions`)
- **Luminous Glowing Category Halos & Left Stripes**:
  - Budget-linked transactions feature vibrant category halos, 4.5px left accent stripes, and pulsing status beacons.
  - Category palette:
    - 🔵 Fixed Household Obligations (`#38bdf8`)
    - 🟠 Debt Acceleration & DebiChecks (`#f59e0b`)
    - 🟢 Goal & Sinking Fund Contributions (`#10b981`)
    - 🟣 Everyday Living & Groceries (`#a855f7`)
    - 🔴 Unbudgeted / Out-of-Budget Spend (`#f43f5e`)
- **Budget Plan Coverage Bar**:
  - Visual segmented progress bar at the top of the feed detailing budgeted vs. unbudgeted coverage.
- **1-Click Interactive Reclassification Modal**:
  - Modify merchant, amount, city/location, and reclassify any transaction to any active `BudgetLineItem`.
- **Real-Time Top KPI Stat Card Synchronization**:
  - `onSummaryChange` event listener dynamically updates all 4 top KPI cards (*Total Inflow*, *Total Outflow*, *Net Reconciled Cashflow*, *Budget Plan Match Rate*) whenever the pay period dropdown changes.

---

### 3. Interactive Money Journey Neural Flow Visualizer (`MoneyFlowNetworkCanvas.tsx`, `/money-journey`)
- **4-Layer Directed Acyclic Graph (DAG)**:
  - Visualizes money lineage across:
    1. **Layer 0 — Inflows & External Sources** *(SARS Salary, Dividends, Cash Wallet)*
    2. **Layer 1 — Core Staging Accounts** *(Prestige Current, Titanium Credit Card, Secondary Cash)*
    3. **Layer 2 — Financial Allocations & Debts** *(Home Loan, WesBank Vehicle, Groceries, Rates, Trust)*
    4. **Layer 3 — Ultimate Endpoints & Debtors** *(Standard Bank, City of Ekurhuleni, Vodacom, Supermarkets)*
- **Smart Auto-Fit Viewport Calculation**:
  - Computes network bounding boxes and auto-scales/centers the entire network on mount and whenever pay period filters change.
- **Expandable Height Toggle**:
  - Switch between compact viewport (`560px`) and full expanded canvas mode (`880px+`).
- **GPU Canvas Curvature Clipping**:
  - `-webkit-mask-image: -webkit-radial-gradient(white, black)` and `isolation: isolate` preventing GPU canvas bleed over card corners.
- **Normalized Node Calculations**:
  - Eliminates double-counting on account nodes and consolidates duplicate accounts into unified DAG nodes.

---

### 4. Financial Intelligence & Leakage Hub (`src/app/reports/page.tsx`, `/reports`)
- **Dynamic Verified Monthly Take-Home Salary**:
  - Dynamically calculates salary based on verified bank statement records for each selected pay cycle:
    - **August 2026**: `R 74,438.26` *(Confirmed SARS Payslip)*
    - **July 2026**: `R 71,026.90` *(Confirmed Statement Deposit)*
    - **June 2026**: `R 71,326.43` *(Confirmed Statement Deposit)*
    - **May 2026**: `R 74,217.05` *(Confirmed Statement Deposit)*
    - **April 2026**: `R 74,550.25` *(Confirmed Statement Deposit)*
    - **March 2026**: `R 81,932.37` *(Confirmed Statement Deposit)*
    - **February 2026**: `R 73,750.62` *(Confirmed Statement Deposit)*
- **Dynamic Debt & Living Outflow Breakdowns**:
  - Subtitle metrics reflect actual cycle debts, living spend, and operating free cash.
- **30-Day Pay Cycle Cash Runway & Burn Rate**:
  - Tracks 4-week burn velocity and buffer against the selected pay cycle range.
- **Leakage & Friction Charges Radar**:
  - Identifies bounce fees, overdraft service fees, card decline fees, and instant voucher costs with actionable elimination guidance.
- **6-Month Historical Trajectory Visualizer**:
  - Verified multi-month bar comparison of salary inflow vs. actual outflows and free margin.

---

### 5. Monthly Budget & Cashflow Engine (`src/app/budget/page.tsx`, `/budget`)
- **Pay-Cycle Control Bar**:
  - Mode switcher pills for `Payslip Auto` vs `Calendar Month`, weekend shift alerts, and salary date ranges.
- **Dual Net Margin Stat Grid**:
  - Tracks **Take-Home Income**, **Recurring Obligations**, **Recurring Net Margin**, and **Actual Margin (This Month)**.
- **Customized User Budget Items**:
  - Sinking funds for Car Brakes Repair (`R 2,500.00`), Family Weekend Getaway (`R 2,500.00`), and Optimized Groceries (`R 7,700.00`) persisted to database and seed.

---

### 6. Payoff Timeline & Debt Waterfall Acceleration (`/timeline`, `/payoff`, `/debts`)
- **Dual-Track Debt Cascade Engine**:
  - Groups liabilities into short-term consumer debts vs. 20-year mortgage bond.
- **Strategy & View Switchers**:
  - Segmented pill switchers for **Snowball vs. Avalanche** strategy and **Chart vs. Table** views.
- **Adaptive X-Axis Zoom Presets**:
  - Controls for `⚡ Auto (Adaptive)`, `18 Months (Consumer)`, `5 Years`, and `Full Mortgage`.

---

### 7. Cooperative Multi-Agent AI System & BYOK Integration
- **4 Specialized AI Agents**:
  - **Document Agent**: Vision & OCR scanning for bank statements, payslips, and municipal bills.
  - **Budget Agent**: Analyzes monthly cash flow streams and calculates Dual Net Margins.
  - **Debt Acceleration Agent**: Simulates Snowball vs. Avalanche payoff timelines and interest savings.
  - **Goals & Wealth Agent**: Projects emergency fund targets and wealth accumulation.
- **Human-in-the-Loop Review Queue (`/recommendations`)**:
  - Agent proposals with plain-language rationales and an **Approve & Apply** button.
- **Bring Your Own Key (BYOK) Integration (`/settings`)**:
  - Encrypted API key storage for Google Gemini, OpenAI, Anthropic, and Azure OpenAI with live endpoint authentication.

---

## 🔐 Security Architecture

- 🔑 **Password Hashing**: `bcrypt` (10 salt rounds) — plaintext passwords are never stored.
- 🛡️ **Session Protection**: Base64 HTTP-only `auth_session` cookies preventing XSS and client-side session tampering.
- 🔒 **Row-Level Tenant Isolation**: Server-enforced `userId` query scoping preventing horizontal privilege escalation across users.
- 🛡️ **SQL Injection Defense**: Prisma ORM Parameterized Prepared Queries neutralizing SQL injection payloads.
- 🔐 **BYOK Key Encryption**: AES-256-CBC authenticated encryption for LLM keys in `src/agents/llmProvider.ts`.
- 📋 **Audit Log Engine**: `AuditLogEntry` model recording all user and agent mutations.

---

## 🛠️ Getting Started & Local Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 16+ running on `localhost:5432`

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://sqamtho:%24qamth0%232025@localhost:5432/money_manager?schema=public"
```

### 3. Install Dependencies & Initialize Database
```bash
npm install
npx prisma db push
npx tsx scripts/create-tables.ts
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev -p 3001
```
Open [http://localhost:3001](http://localhost:3001) in your browser. Unauthenticated visitors are automatically routed to `/login`.

---

## 🧪 Automated Testing & Verification

- **Vitest Unit Test Suite**: `npm test` (**33/33 passing tests** across 4 test files).
- **TypeScript Typecheck**: `npx tsc --noEmit` (**0 errors**).
- **API Pay Cycle Test**: `node scratch/verify_all_cycles.js` (**100% passing HTTP 200 responses**).
