# MoneyManager — Complete User Manual

**Version 1.0 · August 2026**
**Wealth & Finance Intelligence Platform**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
   - [Registration & Login](#21-registration--login)
   - [Onboarding Wizard](#22-onboarding-wizard)
3. [Dashboard — Executive Overview](#3-dashboard--executive-overview)
4. [Overview & Wealth](#4-overview--wealth)
   - [Net Worth Tracker](#41-net-worth-tracker)
   - [Goals & Wealth](#42-goals--wealth)
   - [Money Journey](#43-money-journey)
5. [Cashflow & Banking](#5-cashflow--banking)
   - [Accounts](#51-accounts)
   - [Transactions](#52-transactions)
   - [Cash Wallet](#53-cash-wallet)
   - [Monthly Budget](#54-monthly-budget)
6. [Debt & Freedom Engine](#6-debt--freedom-engine)
   - [Debt Register](#61-debt-register)
   - [Payoff Timeline](#62-payoff-timeline)
   - [Scenario Planner](#63-scenario-planner)
7. [Intelligence & Vault](#7-intelligence--vault)
   - [Agent Inbox](#71-agent-inbox)
   - [ChatBot AI](#72-chatbot-ai)
   - [Document Vault](#73-document-vault)
   - [Reports & Leakages](#74-reports--leakages)
8. [System & Settings](#8-system--settings)
   - [Settings & BYOK](#81-settings--byok)
   - [Billing & Plans](#82-billing--plans)
   - [Profile](#83-profile)
9. [AI Agents Architecture](#9-ai-agents-architecture)
10. [Security & Data Privacy](#10-security--data-privacy)
11. [South African Financial Context](#11-south-african-financial-context)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)

---

## 1. Introduction

MoneyManager is a comprehensive personal finance intelligence platform purpose-built for the **South African financial landscape**. It combines real-time wealth tracking, AI-powered document processing, debt cascade simulations, and intelligent budgeting into a single, premium dark-mode interface.

### Core Capabilities

| Capability | Description |
| :--- | :--- |
| **Net Worth Tracking** | Real-time aggregation of all assets (property, vehicles, investments, cash) minus all liabilities |
| **Debt Freedom Engine** | Snowball & avalanche cascade simulations with what-if scenario planning |
| **AI Document Processing** | Upload bank statements, payslips, and bills — AI agents extract and reconcile data automatically |
| **Multi-Agent Intelligence** | 5 cooperating AI agents (Document, Debt, Budget, Goals, Coach) that analyze your finances and propose actionable recommendations |
| **Cash Wallet** | Track physical cash spending (domestic workers, garden services, groceries, parking) that doesn't appear on bank statements |
| **Financial Health Score** | Composite score (0–1000) evaluating debt-to-income, emergency reserves, payment history, and more |
| **Geotagged Spending Radar** | Interactive map showing where your money is spent geographically |
| **Scenario Planner** | Model "what-if" scenarios: lump-sum payments, interest rate shocks, turbo snowball acceleration |

### System Requirements

- Modern web browser (Chrome, Edge, Firefox, Safari)
- Internet connection
- Supported document formats: PDF bank statements, payslips, and invoices from South African institutions

---

## 2. Getting Started

### 2.1 Registration & Login

#### Creating a New Account

1. Navigate to the application URL
2. On the login screen, click **"Create Account"** to switch to registration mode
3. Fill in the required fields:
   - **Username** — Your unique identifier (e.g., `mokhotm`)
   - **Email Address** — For account recovery and notifications
   - **Password** — Minimum 8 characters; a strength indicator shows password quality
   - **Confirm Password** — Must match exactly
   - **Full Name** — Your legal name
   - **Job Title** *(optional)* — Your professional title
4. Click **"Create Account"**
5. On success, you'll be redirected to the onboarding wizard

#### Signing In

1. Enter your **Username** and **Password**
2. Click **"Sign In"**
3. Use the 👁 icon to toggle password visibility
4. After successful authentication, you're taken to the executive dashboard

#### Signing Out

- Click the **logout icon** (⏻) in the bottom-left corner of the sidebar
- You will be redirected to the login screen

> [!TIP]
> Your session persists across browser tabs. Closing and reopening the browser will require re-authentication.

---

### 2.2 Onboarding Wizard

After registration, MoneyManager guides you through a **document preparation checklist** to help you gather the financial documents needed for accurate analysis.

#### Document Checklist

| Document | Required? | Why It Matters |
| :--- | :---: | :--- |
| **Latest Payslip** | ✅ Yes | Confirms take-home income, pay date, and bonus amounts. *This is the single most important document.* |
| **Bank Statements (last 3 months)** | ✅ Yes | Shows real balances, debit orders, and spending patterns |
| **Municipal / Rates Bill** | Optional | Property valuation, arrears, and pre-termination urgency notices |
| **Credit Card Statement** | Optional | Balance owed, interest rate, and minimum payment |
| **Personal / Home Loan Statement** | Optional | Balance outstanding, instalment amount, interest rate |
| **Vehicle Finance Statement** | Optional | Outstanding balance, monthly instalment, settlement value |
| **Telecom / Service Invoice** | Optional | Arrears, termination penalties, and urgency notices |

> [!IMPORTANT]
> Without a payslip, the budget engine and snowball calculations will use **estimates**. Upload your payslip first for the most accurate results.

Once you've checked off the required documents, click **"Continue to Document Vault →"** to begin uploading.

---

## 3. Dashboard — Executive Overview

The **Wealth & Financial Dashboard** is your command center — a real-time overview of your entire financial life.

### Key Metrics (Top Row)

| Card | What It Shows |
| :--- | :--- |
| **Total Net Worth** | Assets minus all debts. Colour-coded gold for positive, red for negative |
| **Total Active Debt** | Sum of all outstanding balances across all debt accounts |
| **Net Margin (Recurring)** | Monthly surplus after all recurring obligations (debit orders, instalments) |
| **Net Margin (This Month)** | Actual surplus including one-off and unexpected items this month |

### Dashboard Widgets

1. **AI Agents Active** — Shows the status of all 4 AI agents (Document, Debt, Goals, Budget). Click **"Review Agent Proposals"** to see pending recommendations.

2. **Goals Progress** — Visual progress bar showing your nearest goal (e.g., Emergency Fund at 22% funded). Click **"View All Goals"** to manage.

3. **Financial Health Gauge** — Animated gauge displaying your composite health score (0–1000) with tier label (e.g., "Expert Wealth Strategist").

4. **Tabbed Visualizations Hub** — Interactive charts:
   - **Spending by Category** — Pie/donut chart of where your money goes
   - **Net Worth History** — Trend line showing net worth over time
   - **Cash Flow History** — Income vs. expenditure bar chart
   - **Spending Heatmap** — Heat map showing spending patterns by day/time
   - **Debt Distribution** — Breakdown of debt balances by account

5. **Geotagged Spending Radar** — Interactive Leaflet map pinpointing transaction locations with merchant categories and amounts.

### Quick Actions (Top Right)

- **Upload Statement** — Jump directly to the Document Vault to upload a new document
- **Agent Inbox** — Review pending AI agent recommendations

### Urgency Banners

If any debt has a **SERVICE_INTERRUPTION_RISK** flag (e.g., municipal pre-termination notice), a prominent red banner appears at the top of the dashboard with the institution name, balance, and a link to **"View Risk Plan"**.

---

## 4. Overview & Wealth

### 4.1 Net Worth Tracker

**Navigation:** Sidebar → *Net Worth*

A comprehensive breakdown of your total wealth position.

#### Assets Section
- View all registered assets grouped by type:
  - **Real Estate Property** — Municipal valuations, market estimates
  - **Vehicle / Auto** — Current market value
  - **Investment Portfolio** — Unit trusts, ETFs, share portfolios
  - **Pension & Retirement** — Provident fund, pension fund, RA
  - **Cash & Bank Savings** — Bank account balances
  - **Other Assets** — Any additional assets
- Each asset shows its **value confidence** level (Confirmed / Estimated / Unknown) and **value source**
- **Search** assets by name or type

#### Liabilities Section
- All debt accounts with current balances
- Subtotals for total assets, total liabilities, and net worth

#### Key Ratios
- **Debt-to-Asset Ratio** — Total debt as a percentage of total assets
- **Liquid Coverage** — Cash & liquid assets vs. short-term obligations
- **Net Worth Trend** — Direction indicator (↑ improving, ↓ declining)

> [!TIP]
> Keep asset valuations up to date for the most accurate net worth figure. The system supports both confirmed (document-backed) and estimated values.

---

### 4.2 Goals & Wealth

**Navigation:** Sidebar → *Goals & Wealth*

Set, track, and project financial goals with AI-powered completion forecasts.

#### Supported Goal Types

| Goal Type | Icon | Description |
| :--- | :---: | :--- |
| Emergency Reserve | 🛡 | Build 3–6 months of living expenses as a safety net |
| Debt Freedom | ✨ | Become completely debt-free by a target date |
| House Deposit | 🏠 | Save for a property deposit |
| Investment Growth | 📈 | Grow your investment portfolio to a target value |
| Education Fund | 🎓 | Save for education (self or children) |
| General Savings | 🛒 | Any other savings target |

#### Creating a Goal

1. Click **"+ New Goal"**
2. Select the goal type from the dropdown
3. Enter:
   - **Goal Name** — A descriptive label (e.g., "3-Month Emergency Fund")
   - **Target Amount** — The ZAR amount you're aiming for (or a formula like `3 × monthly_expenses`)
   - **Monthly Contribution** — How much you'll put toward this goal each month
   - **Priority** — Ranking relative to other goals (1 = highest)
4. Click **"Save"**

#### Goal Projections

Each goal card displays:
- **Progress bar** — Percentage funded
- **Months to Target** — AI-projected months until completion at current contribution rate
- **Projected Completion Date** — Calendar date the goal will be achieved
- **Shortfall** — Any deficit if the current trajectory won't meet the target
- **Status** — Active, Achieved, or Paused

#### Managing Goals

- **Edit** (✏️) — Update target amount, contribution, or priority
- **Delete** (🗑) — Remove a goal permanently
- **Filter** — Filter by goal type or status

---

### 4.3 Money Journey

**Navigation:** Sidebar → *Money Journey*

A stunning visual narrative of how your money flows through your financial ecosystem.

#### Network View
An interactive **force-directed graph** showing:
- **Income sources** (green nodes) flowing into bank accounts
- **Bank accounts** (blue nodes) distributing to obligations
- **Debt payments** (amber links) flowing to creditors
- **Cash withdrawals** (purple links) flowing to the cash wallet
- **Investments** (cyan links) flowing to growth assets

Controls:
- **Zoom In/Out** — Magnifying glass buttons or scroll wheel
- **Reset** — Return to default zoom and position
- **Toggle View** — Switch between Network and Bubble views
- **Filter** — Show/hide specific flow types (Income, Transfers, Debt, Cash, Investments)
- **Search** — Find specific accounts or transactions
- **Fullscreen** — Expand to full viewport

#### Bubble View
An alternative **bubble canvas** visualization where:
- Each bubble represents a financial entity (account, creditor, employer)
- Bubble size is proportional to the monetary volume flowing through it
- Color-coded by flow type
- Hover for detailed breakdowns

#### Flow Legend
Each flow type has a distinct color:
- 🟢 **Income** — Salary, freelance, rental income
- 🔵 **Transfers** — Between own accounts
- 🟡 **Debt Payments** — Instalments, minimums, extra payments
- 🟣 **Cash Withdrawals** — ATM and cashback
- 🩷 **Cash Spending** — Physical cash expenditures
- 🔷 **Investment** — Unit trusts, ETFs, retirement contributions
- ⬜ **Other** — Uncategorized flows

---

## 5. Cashflow & Banking

### 5.1 Accounts

**Navigation:** Sidebar → *Accounts*

The central registry of all your bank accounts, credit cards, loans, and service accounts.

#### Account Types

| Type | Description |
| :--- | :--- |
| **Current / Checking** | Everyday transactional banking accounts |
| **Credit Card** | Revolving credit facilities |
| **Term Loan / Mortgage** | Home loans, personal loans, vehicle finance |
| **Municipal Services** | Municipal rates, water, and electricity accounts |
| **Service Provider / Telco** | Cellphone contracts, internet, and similar service accounts |
| **Savings** | Notice deposits and savings accounts |
| **Investment** | Unit trusts, share portfolios, and similar |
| **Other** | Any account not fitting the above categories |

#### Adding an Account

1. Click **"+ Add Account"**
2. Fill in:
   - **Account Name** — Descriptive name (e.g., "FNB Gold Cheque")
   - **Institution** — Bank or service provider name
   - **Account Number (Masked)** — Last 4 digits only for identification (e.g., ••••4521)
   - **Account Type** — Select from the dropdown
   - **Currency** — Defaults to ZAR
   - **Opening Balance** — Starting balance or current balance at time of entry
   - **Is Debt Account?** — Toggle on if this is a liability (loan, credit card, etc.)
   - **Notes** — Any additional context
3. Click **"Save"**

#### Account Features

- **Edit** (✏️) — Modify account details
- **Delete** (🗑) — Remove the account (requires confirmation)
- **Filter** — By account type
- **Refresh** — Re-fetch latest balances from uploaded statements
- **Debt Indicator** — Accounts flagged as debt show current balance, confidence level, interest rate, and minimum payment

---

### 5.2 Transactions

**Navigation:** Sidebar → *Transactions*

A comprehensive, searchable ledger of all banking transactions extracted from your uploaded statements.

#### Transaction Overview

At the top, four summary cards show:
- **Total Transactions** — Count of transactions in the selected period
- **Total Inflow** — Sum of all credits (salary, refunds, transfers in)
- **Total Outflow** — Sum of all debits
- **Net Balance** — Inflow minus outflow
- **Budgeted vs. Unbudgeted Outflow** — How much spending was within your budget envelope
- **Budget Adherence Rate** — Percentage of outflow that was pre-budgeted

#### Features

- **Period Selector** — Choose the month/year to view (e.g., 2026-07)
- **Cycle Type** — Toggle between `SALARY` cycle (payday-to-payday) and `CALENDAR` month
- **Smart Search** — Full-text search across descriptions, references, and amounts
- **Category Tags** — Each transaction is auto-classified (Groceries, Transport, Insurance, etc.)
- **Inflow/Outflow Indicators** — Green arrows for credits, red for debits
- **Per-Transaction Detail** — Date, description, reference, amount, running balance, and matched account

> [!TIP]
> The salary cycle view aligns transactions to your actual pay period (e.g., 15th to 14th) rather than calendar months, giving a more realistic picture of spending between paydays.

---

### 5.3 Cash Wallet

**Navigation:** Sidebar → *Cash Wallet*

Track **physical cash spending** that never appears on your bank statements — a critical gap in most financial apps.

#### Why Cash Tracking Matters

In South Africa, many everyday expenses are cash-based:
- Domestic worker wages
- Garden service payments
- Local market groceries
- Minibus taxi fares
- Car guard tips and parking fees

Without tracking these, your budget has a "leak" that can add up to thousands of rands per month.

#### Cash Categories

| Category | Icon | Typical Use |
| :--- | :---: | :--- |
| Domestic Worker | 🏠 | Fortnightly cleaning & housekeeping |
| Garden Services | 🌿 | Lawn care & garden maintenance |
| Groceries & Food | 🛒 | Local market, fresh produce |
| Taxi & Transport | 🚗 | Minibus taxis, fuel cash |
| Coffee & Dining | ☕ | Café meals, takeaway |
| Parking & Tips | 🅿 | Car guards, parking meters |
| Discretionary | ✨ | Miscellaneous cash spending |

#### Recording Cash Transactions

1. Select a **category** from the category grid
2. Choose a **preset amount** (R100, R200, R500, R700, R950, R1000) or enter a custom amount
3. Add an optional **description**
4. Click **"Record Cash Spend"**

#### Cash Wallet Features

- **Tracked Balance** — Running total of cash in your wallet (starts from ATM withdrawals)
- **Flow Filters** — View All, Inflows only, Domestic & Garden only, or General Spending
- **Transaction History** — Scrollable list of all recorded cash flows with date, category, description, and amount
- **Reconciliation** — "Last Reconciled" indicator shows when cash balance was last verified
- **Spending Analytics** — Category breakdown, trends, and monthly totals

---

### 5.4 Monthly Budget

**Navigation:** Sidebar → *Monthly Budget*

A structured, envelope-based budgeting system aligned to your South African salary cycle.

#### Budget Categories

| Category | Description |
| :--- | :--- |
| **Fixed Household Obligations & Subscriptions** | Rent/bond, electricity, water, insurance, DStv, internet — non-negotiable monthly payments |
| **Debt Acceleration Plan** | Contractual debt payments — credit card minimums, loan instalments, municipal arrears |
| **Goal Contributions & Emergency Reserves** | Monthly savings toward financial goals (emergency fund, house deposit, education) |
| **Family & Discretionary** | Groceries, fuel, entertainment, clothing, dining out |
| **One-Off / Unexpected** | Medical emergencies, car repairs, appliance replacement |

#### Creating Budget Lines

1. Click **"+ Add Item"** within a category
2. Enter:
   - **Description** — What the line item is (e.g., "Electricity prepaid")
   - **Budgeted Amount** — How much you plan to spend
3. Click **"Save"**

#### Budget Dashboard

- **Total Income** — Your confirmed take-home pay
- **Total Budgeted** — Sum of all budget line items
- **Remaining** — Income minus budgeted (your surplus or deficit)
- **Category Progress Bars** — Visual indication of spending vs. budget per category
- **Variance Indicators** — 🟢 Under budget, 🟡 Near limit, 🔴 Over budget
- **Month Selector** — Switch between months to compare budgets

#### Budget vs. Actual

Each line item shows:
- **Planned** — What you budgeted
- **Actual** — What was actually spent (auto-matched from transactions)
- **Variance** — The difference, colour-coded

> [!TIP]
> The system auto-populates actual spending from your uploaded bank statements. The more statements you upload, the more accurate budget tracking becomes.

---

## 6. Debt & Freedom Engine

The heart of MoneyManager — a suite of tools to systematically eliminate debt using proven mathematical strategies.

### 6.1 Debt Register

**Navigation:** Sidebar → *Debt Register*

A complete inventory of every debt obligation with detailed metadata.

#### Debt Record Fields

| Field | Description |
| :--- | :--- |
| **Account** | Linked bank/service account |
| **Current Balance** | Outstanding amount owed |
| **Balance Confidence** | 🟢 Confirmed (from statement), 🟡 Estimated, 🔴 Unknown |
| **Annual Interest Rate** | The APR charged on the balance |
| **Interest Rate Confidence** | Confirmation level of the rate |
| **Minimum Payment** | Contractual monthly minimum |
| **Payment Mode** | How payments work (see below) |
| **Urgency Flag** | Risk level (see below) |
| **Include in Snowball** | Whether this debt participates in the cascade engine |
| **Priority Override** | Manual ranking for custom payoff order |
| **Status** | Active, Settled, or Suspended |

#### Payment Modes

| Mode | Description |
| :--- | :--- |
| **Min Only (Revolving)** | Minimum payment only; balance revolves (e.g., credit cards) |
| **Fixed Instalment** | Fixed monthly instalment (e.g., home loan, vehicle finance) |
| **Fixed Term Loan** | Loan with a fixed term and payment schedule |
| **Interest Only** | Paying interest only, balance doesn't reduce |

#### Urgency Flags

| Flag | Meaning |
| :--- | :--- |
| **NONE** | No urgency — standard debt |
| **SERVICE_INTERRUPTION_RISK** | Risk of service disconnection (electricity, water, phone) — **prioritized in cascade** |
| **LEGAL_ACTION_RISK** | Threat of legal proceedings or garnishee order |
| **HIGH_INTEREST_TRAP** | Interest rate so high the balance is growing faster than payments reduce it |

#### Managing Debts

- **+ Add Debt** — Register a new debt manually
- **Edit** (✏️) — Update balance, rate, or payment details
- **Delete** (🗑) — Remove with confirmation
- **Filter** — By urgency, payment mode, or status
- **Toggle Snowball** — Include/exclude from cascade simulation
- **Bulk Actions** — Select multiple debts for batch updates

---

### 6.2 Payoff Timeline

**Navigation:** Sidebar → *Payoff Timeline*

A visual, month-by-month simulation of your debt elimination journey using the **Snowball** or **Avalanche** strategy.

#### How It Works

The payoff engine calculates:
1. **Total Income** — Your confirmed monthly take-home
2. **Total Minimum Payments** — Sum of all contractual minimums
3. **Extra Pool** — Income minus minimums minus budget = the surplus available for accelerated debt payoff
4. **Strategy** — How the extra pool is allocated

#### Strategies

| Strategy | Method | Best For |
| :--- | :---: | :--- |
| **Snowball** | Pay smallest balance first | Psychological momentum — quick wins motivate you |
| **Avalanche** | Pay highest interest rate first | Mathematical optimum — saves the most money on interest |

#### Timeline Visualizations

**Chart View:**
- Stacked area chart showing each debt's balance declining over time
- Each debt is a distinct colour band
- Clearance milestones are marked with ✓ icons
- X-axis: months from now; Y-axis: remaining balance

**Table View:**
- Month-by-month breakdown showing:
  - Opening balance per debt
  - Interest accrued
  - Payment applied (base + extra)
  - Closing balance
  - Clearance flags

#### Summary Metrics

| Metric | Description |
| :--- | :--- |
| **Total Months to Freedom** | How many months until all debts reach R0 |
| **Total Interest Paid** | Cumulative interest over the full timeline |
| **Short-Term Clearance** | Months to clear all consumer debts (excl. mortgage) |
| **Long-Term Clearance** | Months to clear including mortgage/vehicle |
| **Never-Clearing Debts** | Any debts where minimum payments don't cover interest growth |

#### Insufficient Funds Warning

If your available pool cannot cover all minimum payments, the system surfaces an **⚠ Insufficient Funds Warning** with:
- Total fixed obligations required
- Available monthly pool
- Which debts are at risk of growing

---

### 6.3 Scenario Planner

**Navigation:** Sidebar → *Scenario Planner*

The most powerful tool in MoneyManager — run **"what-if" simulations** to see how changes to your financial strategy affect your debt freedom date.

#### Built-In Presets

| Preset | What It Models |
| :--- | :--- |
| **Default** | Current actual trajectory based on real data |
| **Turbo Snowball** | Increase monthly extra payments by a user-defined amount |
| **Windfall Bonus** | Model a one-time lump sum payment (13th cheque, tax refund, inheritance) |
| **Rate Hike Shock** | What happens if interest rates increase by 1–5% across all debts |
| **Avalanche Max** | Switch to pure avalanche strategy with maximized extra payments |

#### Custom Scenario Builder

1. **Adjust Extra Pool** — Slide to increase/decrease the monthly surplus available for debt acceleration
2. **Lump Sum Payment** — Enter a one-time payment amount and select the target:
   - Highest interest rate debt
   - Smallest balance debt
   - A specific named debt
3. **Interest Rate Shock** — Apply a uniform rate increase across all debts (stress test)
4. **Override Individual Debts** — Temporarily modify any debt's balance, rate, or payment for the simulation

#### Comparing Scenarios

The planner shows **side-by-side comparisons**:
- Months to freedom: Default vs. Modified
- Total interest paid: Default vs. Modified
- Monthly cost difference
- Interactive chart overlaying both timelines

#### Real-Time Recalculation

All changes recalculate **instantly in your browser** — the snowball/avalanche engine runs entirely client-side with no server round-trip, so you can experiment freely.

> [!TIP]
> Try the **Windfall Bonus** preset with your expected 13th cheque or annual bonus to see how much time it could shave off your debt freedom date.

---

## 7. Intelligence & Vault

### 7.1 Agent Inbox

**Navigation:** Sidebar → *Agent Inbox*

A unified inbox where all AI agent recommendations are surfaced for your review.

#### Agent Types

| Agent | Badge Colour | Responsibilities |
| :--- | :---: | :--- |
| **DOCUMENT_AGENT** | 🔵 Blue | Processes uploaded documents, extracts data, flags discrepancies |
| **DEBT_AGENT** | 🟡 Amber | Analyzes debt portfolio, recommends optimal payoff strategies |
| **GOALS_AGENT** | 🟣 Purple | Monitors goal progress, suggests contribution adjustments |
| **BUDGET_AGENT** | 🟢 Green | Reviews spending patterns, identifies over/under budget categories |
| **FINANCIAL_COACH** | 🔷 Cyan | High-level strategic advice, behavioral nudges, and holistic financial coaching |

#### Recommendation Cards

Each recommendation card shows:
- **Agent badge** — Which AI agent generated this
- **Title** — Summary of the recommendation
- **Description** — Detailed explanation
- **Rationale** — Why this recommendation was generated (data-driven reasoning)
- **Timestamp** — When it was created

#### Actions

- **✅ Approve** — Accept the recommendation (the system may auto-apply changes)
- **❌ Reject** — Dismiss the recommendation
- **🔊 Listen** — Text-to-speech narration of the recommendation (accessibility feature)

#### Filtering

- **By Agent** — Show only recommendations from a specific agent
- **By Status** — Toggle between Pending and Reviewed (Approved/Rejected)
- **Refresh** — Re-fetch the latest recommendations

---

### 7.2 ChatBot AI

**Navigation:** Sidebar → *ChatBot AI*

A conversational AI assistant that can answer questions about your finances, explain concepts, and provide personalized advice.

#### Features

- **Natural Language Queries** — Ask anything:
  - *"What's my current debt-to-income ratio?"*
  - *"How much interest am I paying on my credit card per month?"*
  - *"Should I focus on paying off my car or my credit card first?"*
  - *"Explain the snowball vs. avalanche method"*
  - *"What would happen if I got a R50,000 bonus?"*

- **Context-Aware** — The chatbot has access to your financial data (accounts, debts, transactions, goals) and gives personalized responses

- **Text-to-Speech** — Click the 🔊 speaker icon on any response to hear it read aloud

- **Conversation Management**:
  - Clear conversation history with the 🗑 button
  - Auto-scrolls to the latest message
  - Loading indicator while the AI is thinking

- **Multi-Model Support** — Powered by your configured LLM provider (Google Gemini by default), with automatic fallback if a model is unavailable

> [!NOTE]
> The chatbot uses your configured API key from Settings & BYOK. If no key is configured, the chatbot will prompt you to add one.

---

### 7.3 Document Vault

**Navigation:** Sidebar → *Document Vault*

The secure repository for all your financial documents, powered by AI-driven extraction and indexing.

#### Uploading Documents

1. Click **"Upload Document"** or drag-and-drop files into the upload zone
2. The system accepts:
   - **PDF** bank statements, payslips, invoices, and bills
3. Select the **document type**:
   - Payslip
   - Bank Statement
   - Municipal Bill
   - Credit Card Statement
   - Loan Statement
   - Vehicle Finance Statement
   - Telecom Invoice
4. Optionally link to an existing **account** and specify the **statement period**
5. Click **"Upload & Process"**

#### AI Processing Pipeline

After upload, the **Document Sync Pipeline** performs:

1. **SHA-256 Fingerprinting** — Detects duplicate uploads
2. **OCR & Text Extraction** — Reads the document content
3. **AI Entity Extraction** — The Document Agent identifies:
   - Account numbers and institution names
   - Transaction dates, descriptions, and amounts
   - Balances (opening, closing)
   - Interest rates and payment schedules
   - Urgency notices (pre-termination warnings)
4. **Transaction Sync** — Extracted transactions are matched and reconciled with existing records
5. **Debt Auto-Update** — Balances and rates are updated if newer data is found
6. **Search Indexing** — Document content is chunked and indexed for semantic search

#### Document Status Indicators

| Status | Meaning |
| :--- | :--- |
| 🟢 **Parsed** | Successfully processed and data extracted |
| 🟡 **Processing** | Currently being analyzed by the AI pipeline |
| 🔴 **Failed** | Processing failed — may need manual review or re-upload |
| ⚪ **Pending** | Queued for processing |

#### Semantic Search

Use the **search bar** to query across all uploaded documents:
- Search by keywords, amounts, dates, or institution names
- Results show matching content snippets with **similarity scores**
- Click a result to view the source document

#### Document Management

- **View** (👁) — Preview document content and extracted data
- **Delete** (🗑) — Remove document and its extracted data
- **Filter** — By document type, institution, or date range
- **Duplicate Detection** — Files with identical SHA-256 hashes are flagged

#### Pay Period Intelligence

The vault uses **South African payroll calendar** logic:
- Pay date defaults to the **15th of each month**
- If the 15th falls on a weekend, it shifts to the preceding Friday
- If it falls on a **South African public holiday**, it shifts to the preceding business day
- Salary cycle ranges are calculated accordingly (e.g., 15 July – 14 August)

---

### 7.4 Reports & Leakages

**Navigation:** Sidebar → *Reports & Leakages*

Comprehensive financial analytics with a focus on finding money "leaks" — unnecessary or wasteful spending you may not be aware of.

#### Report Sections

**Leakage Detection:**
- AI-identified transactions that may be wasteful:
  - Duplicate subscription charges
  - Unused gym memberships
  - Excessive bank fees
  - Round-up charges
  - Loyalty programme charges with no benefit
- Each leakage shows:
  - Date, description, and amount
  - The account it was charged to
  - An **action recommendation** (cancel, negotiate, dispute)

**Category Variance Analysis:**
- Budget vs. actual comparison per category
- **Planned** vs. **Actual** with colour-coded variance bars
- Percentage over/under budget

**Income Analysis:**
- Salary breakdown and trends
- Non-recurring income identification
- Income stability assessment

**Debt Cost Report:**
- Total interest paid per debt per month
- Effective cost of each debt (interest as % of payment)
- Projected interest savings from extra payments

**Export & Print:**
- **Download** — Export reports as data files
- **Print** — Print-optimized formatting for physical records

---

## 8. System & Settings

### 8.1 Settings & BYOK

**Navigation:** Sidebar → *Settings & BYOK*

**BYOK = Bring Your Own Key** — MoneyManager lets you connect your own AI provider API keys for maximum privacy and cost control.

#### LLM Provider Configuration

1. Click **"+ Add Provider"**
2. Select a **provider**:
   - **Google (Gemini)** — Recommended. Supports Gemini 3.7 Flash, 2.5 Flash, 2.5 Pro, 2.0 Flash, 1.5 Pro, 1.5 Flash
   - **OpenAI** — GPT-4o, GPT-4o Mini, GPT-4 Turbo
   - **Anthropic** — Claude 4 Opus, Claude 3.5 Sonnet
   - **Ollama (Local)** — Run models locally with zero cost and full privacy
   - **OpenRouter** — Access hundreds of models through a single API
3. Enter your **API Key** (encrypted with AES-256 before storage)
4. Select the **model** from verified presets or enter a custom model name
5. Optionally set a **Base URL** (for self-hosted or proxied endpoints)
6. Check **Supports Vision** if the model can process images (for document OCR)
7. Click **"Save & Validate"** — the system tests the key with a live API call

#### Agent Assignment Matrix

After adding providers, you can assign specific models to specific agents:

| Agent | Default | Can Be Overridden To |
| :--- | :--- | :--- |
| Document Agent | Primary provider | Any configured provider (vision-capable preferred) |
| Debt Agent | Primary provider | Any configured provider |
| Budget Agent | Primary provider | Any configured provider |
| Goals Agent | Primary provider | Any configured provider |
| Coach Agent | Primary provider | Any configured provider |
| ChatBot | Primary provider | Any configured provider |

#### Provider Status

- 🟢 **Active** — API key validated and working
- 🟡 **Validating** — Currently testing the connection
- 🔴 **Invalid** — Key rejected or endpoint unreachable

#### Pricing Categories

Models are labelled by cost tier:
- **Free (Local)** — Ollama models running on your machine
- **Free Tier** — Free API tiers (e.g., Gemini Flash free quota)
- **Ultra Low Cost** — Sub-cent per query models
- **Paid API** — Premium models with per-token billing

> [!IMPORTANT]
> Your API keys are **encrypted at rest** using AES-256 with your unique encryption key. They are never logged, never sent to MoneyManager servers, and are only used to make direct API calls to your chosen provider.

---

### 8.2 Billing & Plans

**Navigation:** Sidebar → *Billing & Plans*

Manage your MoneyManager subscription tier.

#### Subscription Tiers

The platform offers multiple subscription tiers with ascending feature access. Each tier card shows:
- **Price** (monthly and annual options)
- **Feature entitlements** — What's included
- **Current plan indicator** — Highlights your active subscription

#### Billing Features

- **Toggle Monthly / Annual** — Annual billing typically offers a discount
- **Upgrade / Downgrade** — Switch tiers instantly
- **Checkout** — Secure payment processing with idempotency protection
- **Billing History** — View past invoices and payment dates
- **Current Period** — Shows your billing cycle start and end dates

#### Payment Methods

- Credit/debit card
- EFT (Electronic Funds Transfer)
- Apple Pay (where supported)

#### Subscription Status

| Status | Meaning |
| :--- | :--- |
| **Active** | Subscription is current and all features are available |
| **Past Due** | Payment failed — dunning process initiated |
| **Cancelled** | Subscription cancelled — access continues until period end |
| **Expired** | Subscription has ended — limited to free tier features |

---

### 8.3 Profile

**Navigation:** Sidebar → *Profile*

View and manage your personal account information.

#### Profile Fields

| Field | Description |
| :--- | :--- |
| **Username** | Your unique login identifier (read-only after creation) |
| **Full Name** | Your legal name |
| **Email** | Contact email for notifications and recovery |
| **Job Title** | Professional title (displayed in sidebar) |
| **Employer Name** | Your employer for payroll alignment |
| **Tax Reference** | SARS tax reference number (for tax-related calculations) |
| **Preferred Currency** | Defaults to ZAR |

#### Editing Your Profile

1. Click **"Edit"** (✏️)
2. Modify any editable fields
3. Click **"Save Changes"**
4. A toast notification confirms the update

#### Account Information

- **Account ID** — Unique system identifier (click to copy)
- **Role** — Your permission level (e.g., Owner, Admin)
- **Subscription Tier** — Current plan name and status
- **Billing Cycle** — Monthly or Annual
- **Member Since** — Account creation date

---

## 9. AI Agents Architecture

MoneyManager employs a **multi-agent cooperative intelligence** system where 5 specialized AI agents work together to analyze your financial data and surface actionable recommendations.

### Agent Pipeline

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  Document Agent │────▶│  Debt Agent   │────▶│ Budget Agent  │
│  (Extraction)   │     │  (Cascade)    │     │ (Allocation)  │
└─────────────────┘     └──────────────┘     └──────────────┘
         │                       │                    │
         │                       ▼                    │
         │              ┌──────────────┐              │
         └─────────────▶│ Goals Agent   │◀─────────────┘
                        │ (Projection)  │
                        └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ Coach Agent   │
                        │ (Synthesis)   │
                        └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ Agent Inbox   │
                        │ (User Review) │
                        └──────────────┘
```

### Agent Descriptions

| Agent | Role | Inputs | Outputs |
| :--- | :--- | :--- | :--- |
| **Document Agent** | Processes uploaded financial documents using OCR and AI extraction | PDF documents | Structured transaction data, account balances, interest rates, urgency flags |
| **Debt Agent** | Analyzes the debt portfolio and runs cascade simulations | Debt register, balances, rates | Optimal payoff strategy, clearance timeline, risk assessments |
| **Budget Agent** | Reviews spending patterns against budget envelopes | Transactions, budget, income | Variance reports, over-spend alerts, reallocation suggestions |
| **Goals Agent** | Projects goal completion timelines and monitors progress | Goals, contributions, balances | Completion forecasts, contribution adjustment recommendations |
| **Coach Agent** | Synthesizes all agent outputs into holistic financial advice | All agent data | Strategic recommendations, behavioral nudges, milestone celebrations |

### LLM Provider Layer

All agents communicate through the **LLM Provider Layer** (`llmProvider.ts`) which:
- Resolves model names to valid API endpoints
- Manages API key encryption/decryption
- Provides automatic fallback if a model returns errors
- Supports multiple concurrent providers (Google, OpenAI, Anthropic, Ollama, OpenRouter)

---

## 10. Security & Data Privacy

MoneyManager takes your financial data security seriously.

### Encryption

| Layer | Protection |
| :--- | :--- |
| **API Keys** | AES-256 encrypted at rest in the database |
| **Passwords** | Hashed using industry-standard algorithms (bcrypt) |
| **Database** | PostgreSQL with parameterized queries (SQL injection prevention) |
| **Transport** | HTTPS/TLS for all data in transit |

### Data Sovereignty

- **BYOK Model** — Your AI API keys are yours. MoneyManager never proxies through its own servers.
- **Local Processing Option** — Use Ollama to run AI models entirely on your own machine
- **No Data Selling** — Financial data is never shared with third parties
- **Document Fingerprinting** — SHA-256 hashes prevent duplicate processing and detect tampering

### Authentication & Authorization

- Session-based authentication with secure HTTP-only cookies
- Role-based access control (Owner, Admin, Viewer)
- Automatic session expiry on inactivity
- HMAC signature verification on webhook endpoints

### Sensitive Data Handling

- Account numbers are stored **masked** (last 4 digits only)
- API keys are displayed masked in the UI (e.g., `sk-••••••••••••abcd`)
- Full API keys are only decrypted at the moment of use and never logged

---

## 11. South African Financial Context

MoneyManager is purpose-built for South African users. Here's how it handles SA-specific financial rules:

### Payroll Calendar

- **Default pay date:** 15th of each month
- **Saturday rule:** If the 15th is a Saturday, pay date shifts to **Friday the 14th**
- **Sunday rule:** If the 15th is a Sunday, pay date shifts to **Friday the 13th**
- **Public holiday rule:** If the adjusted pay date falls on an SA public holiday, it shifts to the **preceding business day**

### Recognized SA Public Holidays

| Date | Holiday |
| :--- | :--- |
| 1 January | New Year's Day |
| 21 March | Human Rights Day |
| 27 April | Freedom Day |
| 1 May | Workers' Day |
| 16 June | Youth Day |
| 9 August | National Women's Day |
| 24 September | Heritage Day |
| 16 December | Day of Reconciliation |
| 25 December | Christmas Day |
| 26 December | Day of Goodwill |
| *Variable* | Good Friday, Family Day (Easter Monday) |

### Supported Institutions

The document extraction AI recognizes statements from major South African banks and service providers:
- **Banks:** Standard Bank, FNB, Capitec, Absa, Nedbank, TymeBank, African Bank, Discovery Bank
- **Credit:** Store cards, credit cards from all major banks
- **Loans:** Home loans, vehicle finance (WesBank, MFC), personal loans
- **Municipal:** All major metro municipalities (City of Johannesburg, Ekurhuleni, City of Tshwane, eThekwini, City of Cape Town, etc.)
- **Telecom:** Telkom, MTN, Vodacom, Cell C, Rain

### Currency

- All amounts are displayed in **South African Rand (ZAR)** using the `R` prefix
- Formatted with thousands separators and 2 decimal places (e.g., R 1 234 567.89)

---

## 12. Troubleshooting & FAQ

### Frequently Asked Questions

**Q: Why is my chatbot returning errors?**
> Ensure you have a valid API key configured in **Settings & BYOK**. The system defaults to Google Gemini 3.7 Flash. If you see a 404 error, go to Settings and re-validate your key.

**Q: Why don't my budget actuals match my bank statement?**
> Upload your latest bank statement to the **Document Vault**. The Budget Agent auto-matches transactions after processing. Ensure the statement period covers the budget month you're viewing.

**Q: Can I use MoneyManager offline?**
> The Scenario Planner runs entirely in-browser and works offline once loaded. However, all other features require an internet connection for database access and AI processing.

**Q: How do I track cash spending that's not on my bank statement?**
> Use the **Cash Wallet** page. Record each cash expense with a category and amount. This closes the gap between your ATM withdrawals and actual cash usage.

**Q: What happens if I upload the same document twice?**
> The system uses **SHA-256 fingerprinting** to detect duplicates. If a file with the same hash already exists, you'll be notified and the upload will be skipped.

**Q: How is my Financial Health Score calculated?**
> The score (0–1000) is a weighted composite of:
> - Debt-to-income ratio
> - Emergency fund coverage
> - Payment consistency
> - Credit utilization
> - Budget adherence
> - Net worth trajectory

**Q: Can multiple users share one account?**
> Currently, MoneyManager is designed for **single-user** personal finance management. Multi-user household support is planned for a future release.

**Q: Is my data backed up?**
> All data is stored in a PostgreSQL database. Backup frequency depends on your hosting provider's configuration. We recommend enabling daily automated backups.

### Common Issues

| Issue | Solution |
| :--- | :--- |
| Chatbot 404 error | Go to Settings → re-validate your API key, ensure model is set to a valid name like `gemini-3.7-flash` |
| Blank dashboard | Ensure you're logged in. Check for authentication errors in the browser console |
| Document upload fails | Verify the file is a valid PDF under 10MB. Try a different browser if issues persist |
| Snowball simulation shows infinity | One or more debts have a minimum payment lower than monthly interest accrual — check and update the interest rate or minimum payment |
| Budget shows R0 everywhere | Upload at least one bank statement and one payslip to populate the budget engine |
| Cash wallet balance is wrong | Reconcile your physical cash count with the tracked balance using the reconciliation feature |

---

> [!NOTE]
> **MoneyManager** is under active development. Features, interfaces, and capabilities may evolve. For the latest updates, check the application's release notes or contact the development team.

---

*MoneyManager — Wealth & Finance Intelligence Platform*
*Built with Next.js · PostgreSQL · Prisma · Google Gemini AI*
*Designed for the South African financial landscape* 🇿🇦
