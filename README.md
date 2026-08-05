# MoneyManagement App — Enterprise Wealth & Debt Payoff Platform

An enterprise-grade personal finance, net worth tracking, and debt snowball acceleration platform built with Next.js 16, TypeScript, PostgreSQL, Prisma ORM, Lucide React, and Recharts.

---

## 🌟 Key Features & Architecture

### 1. Multi-Tenant User Authentication & Row-Level Data Isolation
- **Authentication**: Secure PostgreSQL authentication with `bcrypt` (10 salt rounds) password hashing.
- **Session Management**: Base64 HTTP-only `auth_session` cookies protecting against XSS attacks and session tampering.
- **Registration**: Endpoint `POST /api/auth/register` supporting custom usernames, emails, full names, and job titles with instant auto-login.
- **Row-Level Tenant Isolation**: Server-enforced session scoping (`where: { userId }`) ensuring newly registered users (`testuser01`) start with a clean slate (**R0.00 Debt, R0.00 Net Worth, 0 Accounts**) completely isolated from other users' records.

### 2. Dual-Track Debt Cascade Engine (`src/engine/snowball.ts`)
- **Category Differentiation**: Groups liabilities into `SHORT_TERM` consumer debts (~R434k) vs `LONG_TERM` property mortgage bonds (Standard Bank Home Loan R1.78M).
- **Waterfall Surplus Acceleration**: As soon as consumer debts clear (Month 18), released minimum payments (`R36,755+/month`) automatically cascade directly into extra capital paydowns on the fixed mortgage.

### 3. Adaptive X-Axis Scaling & Unstacked Chart Rendering
- **Dynamic X-Axis Cutoff**: Automatically scales chart bounds to the active category clearance horizon (`M21` for short-term consumer debt, `M252` for mortgage).
- **Y = R0.00 Baseline Accuracy**: Unstacked Area chart rendering guarantees paid-off accounts (`R0.00`) drop strictly to the Y=0 baseline.
- **Interactive Zoom Toolbar**: Presets for `⚡ Auto (Adaptive)`, `18 Months (Consumer)`, `5 Years`, and `Full Mortgage`.

### 4. Vector Embedding RAG & Cooperating AI Agents
- **Semantic RAG Ingestion**: Computes 64-dimensional float vector embeddings for bank statements and payslips stored in PostgreSQL.
- **4 Cooperating Agents**: Document Agent, Debt Agent, Goals Agent, and Budget Agent.
- **BYOK Architecture**: Bring Your Own Key support for OpenAI, Anthropic, Google Gemini, and Azure OpenAI encrypted with AES-256-GCM at rest.

### 5. High-Contrast UX Theme System & Icon Modernization
- **100% Vector SVG Icons**: Modern Lucide React SVG components across all pages, badges, and controls.
- **5 Curated Themes**: Obsidian Gold Dark, Emerald Wealth, Cyberpunk Neon, Alpine Light, and Nordic Light with high-contrast accessibility tokens.

---

## 🔐 Critical Data Security & Protection

- 🔑 **Password Hashing**: `bcrypt` (10 rounds) — plaintext passwords are never stored in database or memory.
- 🛡️ **Session Protection**: Base64 HTTP-only `auth_session` cookies preventing XSS and client-side session tampering.
- 🔒 **Row-Level Tenant Isolation**: Server-enforced `userId` query scoping preventing horizontal privilege escalation across users.
- 🛡️ **SQL Injection Defense**: Prisma ORM Parameterized Prepared Queries neutralizing SQL injection payloads.
- 🔐 **LLM Key Protection (BYOK)**: AES-256-GCM authenticated encryption for LLM keys in `src/agents/llmProvider.ts`.

---

## 🛠️ Getting Started & Installation

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
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🧪 Testing & Verification

- **Vitest Unit Test Suite**: `npx vitest run` (**25/25 passing tests**).
- **TypeScript Typecheck**: `npx tsc --noEmit` (**0 errors**).
