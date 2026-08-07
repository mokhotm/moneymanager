# MoneyManagement App — Enterprise Wealth & Debt Payoff Platform

An enterprise-grade personal finance, net worth tracking, multi-agent AI intelligence, and debt waterfall acceleration platform built with **Next.js 16**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, **Lucide React**, and **Recharts**.

---

## 🌟 Core Architecture & Key Features

### 1. Apple Obsidian Glass Design System
- **Design Excellence**: Built using an **Apple-grade design philosophy** — form follows function, dark obsidian glassmorphism (`backdrop-filter: blur(24px)`), smooth HSL ambient gradients, Watch-style activity metric rings, and segmented pill controls.
- **Standardized Layout Spacing**: Clean grid spacing (`.stat-grid`, `.two-col`, `.three-col`, `.card`) with 24px gaps and standardized margins across all viewports.
- **South African Localization**: Full Rand formatting (`R 0,00` / ZAR) and geotagged South African financial hub data.

### 2. Default Login Landing Page & Next.js Middleware Routing (`src/middleware.ts`)
- **Login Landing Page**: Unauthenticated visitors are automatically routed to `/login` as the default landing page.
- **Smart Auto-Redirect**: Authenticated users visiting `/login` are automatically routed straight to the Executive Dashboard (`/`).
- **Strict Session Authentication**: `getEffectiveUserId(req)` strictly returns `null` when unauthenticated. All private financial data APIs (`/api/dashboard`, `/api/timeline`, `/api/payoff-plan`, `/api/debts`, `/api/budget`, `/api/transactions`, `/api/accounts`, `/api/goals`, `/api/net-worth`, `/api/documents`, `/api/profile`, `/api/settings`) enforce HTTP `401 Unauthorized` responses.
- **Client Auth Gate Cards**: Unauthenticated page views render an **Authentication Required Gate Card** blocking private financial data display.

### 3. Geotagged Spending Location Radar Map (`SpendingLocationMap.tsx`)
- **Geocoded RSA Financial Hub Targets**: Visualizes transactions across Gauteng (Sandton / Pretoria), Western Cape (V&A Waterfront), and KZN (Umhlanga) with connecting N1/N3 transport arteries.
- **Interactive Drag & Pan**: Click-and-drag panning (`onMouseDown`, `onMouseMove`, `onMouseUp`) across the canvas with a dynamic `grabbing` cursor state.
- **Zoom Scaling Engine**: Zoom In (`+`), Zoom Out (`-`), and Reset View controls, plus scroll wheel zooming (`1.0x` – `4.0x` scale indicator).

### 4. Live Banking Transactions & Metadata Editing (`BankingTransactionsCard.tsx`)
- **Reconciled Line-Item Feed**: Reconciled transaction cards with bank institution badges, direction avatars (`+` / `-`), transaction reference codes (`TXN-…`), AI confidence ratings, and ZAR totals.
- **Multi-Bank & Category Filters**: Category pill controls (`All Categories`, `Income & Payroll`, `Debt Service`, `Internal Transfer`, `Cash Spend`) and Bank Institution dropdown (`Standard Bank`, `FNB`, `Capitec`, `Absa`, `Nedbank`).
- **Interactive Metadata Editing Modal**: Clicking any transaction row opens an edit modal to modify:
  - Merchant & Processed Location Name (`e.g. Woolworths Sandton City`)
  - Flow Category (`Income & Payroll`, `Debt Service`, `Internal Transfer`, `Cash Spending`, `Cash Withdrawal`)
  - Transaction Amount (ZAR)
  - AI Categorization Confidence (`CONFIRMED`, `ESTIMATED`)
  - Processed RSA City / Hub (`Johannesburg`, `Pretoria`, `Cape Town`, `Durban`)
- **API Persistence & Audit Logging**: `PUT /api/transactions` updates transaction records and logs changes in `AuditLogEntry`.

### 5. Payoff Timeline & Clearance Horizon (`/timeline`)
- **Dual-Track Debt Cascade Engine**: Groups liabilities into short-term consumer debts vs long-term mortgage bond.
- **Strategy & View Switchers**: Segmented pill switchers for **Snowball vs Avalanche** strategy and **Chart vs Table** views.
- **Adaptive X-Axis Zoom Presets**: Controls for `⚡ Auto (Adaptive)`, `18 Months (Consumer)`, `5 Years`, and `Full Mortgage`.

### 6. Monthly Budget & Cashflow Engine (`/budget`)
- **Pay-Cycle Control Bar**: Mode switcher pills for `Payslip Auto` vs `Calendar Month`, deposit shift alerts, and salary date ranges.
- **Dual Net Margin Stat Grid**: Tracks **Take-Home Income**, **Recurring Obligations**, **Recurring Net Margin**, and **Actual Margin (This Month)**.
- **Category Progress Bars & Line Item Badges**: Allocation share progress bars across 5 categories and line item confidence badges (`CONFIRMED`, `ESTIMATED`, `COMPUTED`).

### 7. Cooperative Multi-Agent AI System & BYOK Integration
- **4 Specialized AI Agents**:
  - **Document Agent**: Vision & OCR scanning for bank statements, payslips, and municipal bills.
  - **Budget Agent**: Analyzes monthly cash flow streams and calculates Dual Net Margins.
  - **Debt Acceleration Agent**: Simulates Snowball vs. Avalanche payoff timelines and interest savings.
  - **Goals & Wealth Agent**: Projects emergency fund targets and wealth accumulation.
- **Human-in-the-Loop Review Queue (`/recommendations`)**: Displays agent proposals with plain-language rationales and an **Approve & Apply** button.
- **Bring Your Own Key (BYOK) Integration (`/settings`)**: Encrypted API key storage for Google Gemini, OpenAI, Anthropic, and Azure OpenAI with live endpoint authentication.

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
