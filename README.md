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
├───────────────────┼───────────────────┼───────────────────┼────────────────────────────┤
│   OPEN FINANCE &  │  GOALS & BUDGET   │  AI FEASIBILITY   │  CONTINUOUS MULTI-AGENT    │
│   ADMIN GATEWAY   │  SURPLUS WATERFALL│  ACTUARIAL AGENT  │       LEARNING HUB         │
├───────────────────┼───────────────────┼───────────────────┼────────────────────────────┤
│ • Stitch Live PKCE│ • Dynamic Surplus │ • Feasibility Sc. │ • Apple-Caliber Obsidian UI│
│ • 8 SA Bank Feeds │ • Priority Order  │ • Debt Drag Ratio │ • 6 Specialized Domains    │
│ • Admin Isolation │ • 2-Way Syncing   │ • Safe Allocation │ • Dynamic Prompt Inject    │
│ • Zero-Mock Policy│ • Micro-Progress  │ • BYOK Multi-LLM  │ • Zero-Mistake Flywheel    │
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

### 4. South African Open Banking & Administrator Gateway (`/settings?tab=banking` & `/settings?tab=admin-gateway`)
- **Stitch Open Finance SA Multi-Bank Connector Directory**:
  - Native, neutral integration for all 8 South African Commercial Banks (Standard Bank, Capitec, FNB, Nedbank, Investec, Absa, Discovery Bank, TymeBank).
  - Eliminates proprietary third-party lock-ins and treats all licensed South African institutions with absolute neutrality (`FIX-022`).
- **Administrator Role Segregation (`FIX-023`)**:
  - **Admin Gateway Portal (`/settings?tab=admin-gateway`)**: System infrastructure credentials (`STITCH_CLIENT_ID`, `STITCH_CLIENT_SECRET`, and redirect URIs) are isolated to a dedicated tab visible exclusively to users with `role: "admin"`.
  - **Backend RBAC Gating**: `POST /api/banking/config` enforces strict administrator checks, rejecting non-admin attempts with `403 Forbidden`. `GET /api/banking/config` withholds sensitive credentials from non-administrators.
  - **Consumer Banking Hub (`/settings?tab=banking`)**: End-users enjoy a clean personal finance interface with zero exposure to developer API keys. If the gateway is not yet activated, users receive an informative notice directing them to contact their administrator.
- **Zero-Mock Policy & Ground-Truth Invariant (`FIX-021`)**:
  - 100% genuine live Open Banking via OAuth 2.0 PKCE. All synthetic mock fallbacks, fake transaction generators, and sandbox account stubs have been completely deleted.
  - Uploaded PDF statements remain isolated in the Document Vault and are never conflated with live API feeds.
- **Authentic Bank Authorization Workflow**:
  - Connecting an account generates an official OAuth authorization challenge redirecting the user to their bank's authenticated portal. The user confirms via their bank's standard multi-factor authentication (e.g. Standard Bank Approve-It, Capitec App approval, FNB InContact).
- **Hybrid Ingestion Architecture (`EmailScannerHub`)**:
  - Combines live Open Banking API feeds with multi-agent inbound IMAP email scanning for e-statements, municipal rates, telco invoices, and payslips.

---

### 5. Dynamic Goal-to-Budget Linking & AI Feasibility Engine (`/goals`, `/budget`)
- **Priority-Based Cashflow Surplus Waterfall**:
  - Calculates real-time available monthly cashflow surplus (`Total Net Income` − `Fixed Obligations` − `Debt Obligations`).
  - Automatically allocates monthly contributions into the active budget under `GOAL_CONTRIBUTIONS` based on goal priority rank when funds are available.
- **AI/LLM Goal Feasibility Evaluator (`src/agents/goalsAgent.ts`)**:
  - Analyzes goal targets against ground-truth salary, high-interest debt APRs, and liquidity buffer margins.
  - Returns a quantitative Feasibility Score (0–100), recommendation on whether to allocate budget, safe monthly allocation amount, and strategic rationale.
- **Synchronized UI/UX**:
  - Goals page features a real-time Surplus Allocation HUD bar, AI Feasibility Badges (`🟢 92/100 AI Feasible`), and interactive AI insight drawers.
  - Budget page displays goal micro-progress bars and direct links to underlying goals.

---

### 6. Payoff Timeline & Debt Waterfall Acceleration (`/timeline`, `/debts`)
- **Dual-Track Debt Cascade Engine**:
  - Groups liabilities into short-term consumer debts vs. 20-year mortgage bond.
- **Strategy & View Switchers**:
  - Segmented pill switchers for **Snowball vs. Avalanche** strategy and **Chart vs. Table** views.
- **Adaptive X-Axis Zoom Presets**:
  - Controls for `⚡ Auto (Adaptive)`, `18 Months (Consumer)`, `5 Years`, and `Full Mortgage`.

---

### 7. Cooperative Multi-Agent AI System & BYOK Multi-LLM Vault (`/settings?tab=ai-models`)
- **5 Specialized AI Agents**:
  - **Document Agent**: Vision & OCR scanning for bank statements, payslips, and municipal bills.
  - **Budget Agent**: Analyzes monthly cash flow streams and calculates Dual Net Margins.
  - **Debt Acceleration Agent**: Simulates Snowball vs. Avalanche payoff timelines and interest savings.
  - **Goals & Wealth Agent**: Projects emergency fund targets and evaluates cashflow feasibility.
  - **Forensics & Audit Agent**: Reconciles cleared bank transactions against ground-truth statements and flags leakages.
- **BYOK Multi-LLM Vault with AES-256-CBC Encryption**:
  - Store and edit API keys for **Google Gemini 3.7 / 2.0**, **Anthropic Claude Opus 4.8 / 3.7 Sonnet**, **OpenAI GPT-5.6 / 4o**, **DeepSeek V4 / R1 Reasoner**, **Alibaba Qwen 3 Max**, **Zhipu GLM-4 Plus**, **Moonshot Kimi K3**, and **Local Ollama / LM Studio** (`http://localhost:11434/v1`).
  - Per-agent model routing and dynamic `.env` key synchronization.

---

### 8. Physical Cash Wallet & 15th-to-15th Salary Cycle Filter (`/cash-wallet`)
- **Multi-Factor Filter HUD**:
  - Filter cash withdrawals and splits by **15th-to-15th Statutory Salary Cycle**, calendar month, flow direction, and category chips with live count badges.
- **Period-Scoped Metrics**:
  - Dynamically calculates total period cash inflows, outflows, domestic worker allocations, and garden maintenance spend.

---

### 9. Multi-Entity & Family Office Workspace Switcher (`src/components/EntitySwitcher.tsx`)
- **One-Click Workspace Switching in Sidebar**:
  - Toggle between **Personal Wealth** (`PERSONAL`), **Family Trust** (`TRUST`), **Operating Company** (`BUSINESS`), and **Property SPV** (`SPV_PROPERTY`).
- **Dynamic Ground-Truth Aggregation**:
  - Automatically calculates live Net Worth, Total Assets, Total Liabilities, and account counts per legal entity without logging out.

---

### 10. South African Statutory Salary & Increase Intelligence Calculator (`/salary-calculator`, `src/engine/salaryCalculator.ts`)
- **SARS 2026/2027 Statutory Tax Modeling**:
  - Computes exact PAYE tax across all 7 statutory tax brackets (18% to 45%), incorporating the primary rebate (R 17,235).
  - Includes **Section 6A Medical Scheme Fees Tax Credits** (R 364 for main member, R 364 for first dependant, R 246 for additional dependants).
  - Enforces statutory **UIF remuneration caps** (1% capped at R 177.12 / month).
  - Calculates pre-tax **Section 11F retirement deductions** (27.5% allowable ceiling capped at R 350,000/year).
- **Interactive Notch Adjustment & Retroactive Backpay Simulation**:
  - Live gross salary slider modeling annual and monthly salary adjustments.
  - Calculates marginal tax bracket creep, incremental net take-home pay, and models backdated lump-sum salary increments across 1 to 12 months.

---

### 11. Continuous Multi-Agent Learning & Feedback Flywheel (`/settings?tab=agent-memory`)
- **Apple-Caliber Obsidian Interface (`FIX-024`)**:
  - Transformed into a premium obsidian control center with a glowing BrainCircuit header, live feedback badge, and 4-card metric grid (Active Rules, High Confidence, Average Confidence, Domain Count).
- **6 Specialized Memory Domains**:
  - Categorizes learned facts across `GEO` (merchants & coordinates), `BUDGET` (pay cycles & envelopes), `DEBT` (payoff preferences), `GOALS` (sinking funds & buffers), `DOCUMENT` (statement layouts), and `PREFERENCE` (user behavior).
- **Dynamic Prompt Augmentation**:
  - The orchestrator injects verified learned rules directly into agent system prompts prior to LLM inference (`getPromptAugmentationMemories`), ensuring agents never repeat past mistakes.
- **Interactive Rule Authoring Modal**:
  - End-users and administrators can teach custom rules via a glassmorphic modal with domain selectors, pattern triggers, instructions, and confidence ratings.

---

### 12. Master Pre-Deployment 6-Pillar Audit Engine (`scripts/run_all_audits.ts`)
- **Mandatory Pre-Deployment Audit Gates**:
  1. **Pillar 1: Database Entity & Account Integrity** — Verifies primary user accounts and active debt facilities.
  2. **Pillar 2: Transaction History & Continuous Statement Parity** — Validates 1,360+ statement flows from bank PDFs.
  3. **Pillar 3: Spending Location Radar & Merchant Accuracy** — Ensures 86+ physical merchants across South African economic nodes with exact GPS and clean classification.
  4. **Pillar 4: Pay Cycle & Budget Reconciliation Engine** — Validates monthly budget execution against statement debit orders and EFTs.
  5. **Pillar 5: Debt Waterfall & Liability Schedules** — Confirms amortization, interest rates, and cascade payoff progress for all 10 debt instruments.
  6. **Pillar 6: Remote AWS EC2 Production & API Health** — Executes live smoke tests and authenticated API probes.
- **Zero-Regression Policy & Automated Test Engine**:
  - All bug fixes recorded in [`CORRECTED_ISSUES_REGISTER.md`](file:///c:/Ezzy/Projects/Money/CORRECTED_ISSUES_REGISTER.md).
  - **21 automated regression tests** in [`tests/regressionAuditSuite.test.ts`](file:///c:/Ezzy/Projects/Money/tests/regressionAuditSuite.test.ts) covering `FIX-001` through `FIX-024`.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5.5+
- **Styling**: Vanilla CSS Design System (`src/styles/globals.css`) with 5 switchable themes (*Obsidian Gold*, *Emerald Wealth*, *Cyberpunk Neon*, *Alpine Gold*, *Nordic Cobalt*)
- **Database**: PostgreSQL 16 + Prisma ORM 5.22
- **Testing**: Vitest 4.1 with automated regression & multi-pillar data integrity engines
- **Deployment**: Docker container on AWS EC2 (`16.171.199.75`)

---

## 🚀 Quick Start & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Synchronize database schema
npx prisma db push

# 4. Run automated regression test suite
npx vitest run

# 5. Run master 6-pillar audit engine
npx tsx scripts/run_all_audits.ts

# 6. Start local development server
npm run dev -- -p 3001
```

Access the application at `http://localhost:3001`.
Production environment is live at `http://16.171.199.75`.
