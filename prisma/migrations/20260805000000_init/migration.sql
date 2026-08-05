-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CURRENT', 'CREDIT_CARD', 'LOAN', 'MUNICIPAL', 'SERVICE_ACCOUNT', 'SAVINGS', 'INVESTMENT', 'RETIREMENT', 'PROPERTY');

-- CreateEnum
CREATE TYPE "BalanceConfidence" AS ENUM ('CONFIRMED', 'ESTIMATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('MINIMUM_ONLY', 'FIXED_INSTALMENT', 'FIXED_TERM_LOAN');

-- CreateEnum
CREATE TYPE "UrgencyFlag" AS ENUM ('NONE', 'SERVICE_INTERRUPTION_RISK', 'LEGAL_ACTION_RISK', 'CREDIT_BUREAU_RISK');

-- CreateEnum
CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'SETTLED_BY_INSURANCE', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "DebtCategory" AS ENUM ('SHORT_TERM', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "SnowballStrategy" AS ENUM ('SNOWBALL', 'AVALANCHE');

-- CreateEnum
CREATE TYPE "IncomeConfidence" AS ENUM ('CONFIRMED', 'ESTIMATED');

-- CreateEnum
CREATE TYPE "RecommendedUse" AS ENUM ('DEBT_PAYDOWN', 'GOAL_CONTRIBUTION', 'EMERGENCY_FUND', 'UNALLOCATED');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('FIXED_HOUSEHOLD_OBLIGATIONS', 'DEBT_ACCELERATION_PLAN', 'GOAL_CONTRIBUTIONS', 'FAMILY_AND_DISCRETIONARY', 'ONE_OFF_UNEXPECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BANK_STATEMENT', 'PAYSLIP', 'INVOICE', 'MUNICIPAL_BILL', 'INVESTMENT_STATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RelatedEntityType" AS ENUM ('ACCOUNT', 'DEBT', 'INCOME', 'ASSET');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('PROPERTY', 'VEHICLE', 'INVESTMENT_PORTFOLIO', 'RETIREMENT_FUND', 'CASH', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('EMERGENCY_FUND', 'DEBT_FREE_BY_DATE', 'HOUSE_DEPOSIT', 'RETIREMENT_INVESTMENT', 'EDUCATION_FUND', 'MAJOR_PURCHASE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('DOCUMENT_AGENT', 'BUDGET_AGENT', 'DEBT_AGENT', 'GOALS_AGENT');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PARSED_AWAITING_REVIEW', 'APPLIED', 'REJECTED_DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "SnapshotGeneratedBy" AS ENUM ('SCHEDULED', 'MANUAL', 'AGENT_TRIGGERED');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('ANTHROPIC', 'OPENAI', 'GOOGLE', 'AZURE_OPENAI', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LLMConfigStatus" AS ENUM ('ACTIVE', 'INVALID_KEY', 'UNVERIFIED', 'DISABLED');

-- CreateEnum
CREATE TYPE "BankConnectionProviderType" AS ENUM ('DIRECT_BANK_API', 'LICENSED_AGGREGATOR');

-- CreateEnum
CREATE TYPE "BankConnectionConsentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SyncFrequency" AS ENUM ('DAILY', 'ON_DEMAND');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT,
    "jobTitle" TEXT,
    "employerName" TEXT,
    "idNumber" TEXT,
    "taxReference" TEXT,
    "preferredCurrency" TEXT NOT NULL DEFAULT 'ZAR',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "accountNumberMasked" TEXT,
    "type" "AccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "openingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "openingBalanceDate" TIMESTAMP(3),
    "isDebt" BOOLEAN NOT NULL DEFAULT false,
    "isAsset" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "currentValue" DECIMAL(65,30) NOT NULL,
    "valueConfidence" "BalanceConfidence" NOT NULL DEFAULT 'ESTIMATED',
    "valueSource" TEXT,
    "linkedDebtId" TEXT,
    "lastValuedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NetWorthSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "totalAssets" DECIMAL(65,30) NOT NULL,
    "totalDebts" DECIMAL(65,30) NOT NULL,
    "netWorth" DECIMAL(65,30) NOT NULL,
    "generatedBy" "SnapshotGeneratedBy" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NetWorthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currentBalance" DECIMAL(65,30) NOT NULL,
    "balanceConfidence" "BalanceConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "balanceSource" TEXT,
    "annualInterestRate" DECIMAL(65,30),
    "interestRateConfidence" "BalanceConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "interestCompounding" TEXT NOT NULL DEFAULT 'MONTHLY',
    "minimumPayment" DECIMAL(65,30) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'MINIMUM_ONLY',
    "originationDate" TIMESTAMP(3),
    "originalPrincipal" DECIMAL(65,30),
    "originalTermMonths" INTEGER,
    "urgencyFlag" "UrgencyFlag" NOT NULL DEFAULT 'NONE',
    "urgencyNote" TEXT,
    "includeInSnowball" BOOLEAN NOT NULL DEFAULT true,
    "priorityOverride" INTEGER,
    "debtCategory" "DebtCategory" NOT NULL DEFAULT 'SHORT_TERM',
    "status" "DebtStatus" NOT NULL DEFAULT 'ACTIVE',
    "settledAmount" DECIMAL(65,30),
    "settledDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "type" "GoalType" NOT NULL,
    "targetAmount" DECIMAL(65,30),
    "targetFormula" TEXT,
    "targetDate" TIMESTAMP(3),
    "linkedAccountId" TEXT,
    "currentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyContribution" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "projectedCompletionDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sourceName" TEXT NOT NULL,
    "recurringAmount" DECIMAL(65,30) NOT NULL,
    "recurringAmountConfidence" "IncomeConfidence" NOT NULL DEFAULT 'ESTIMATED',
    "payDayOfMonth" INTEGER NOT NULL DEFAULT 25,
    "lastConfirmedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeEvent" (
    "id" TEXT NOT NULL,
    "incomeId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "recommendedUse" "RecommendedUse" NOT NULL DEFAULT 'UNALLOCATED',
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "appliedToDebtId" TEXT,
    "appliedToGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLineItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "category" "BudgetCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "isComputed" BOOLEAN NOT NULL DEFAULT false,
    "sourceRef" TEXT,
    "confidence" "BalanceConfidence" NOT NULL DEFAULT 'ESTIMATED',
    "note" TEXT,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementEvent" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "resultingNewMinimumPayment" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettlementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "relatedEntityType" "RelatedEntityType" NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileHash" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsed" BOOLEAN NOT NULL DEFAULT false,
    "parseStatus" "ParseStatus" NOT NULL DEFAULT 'PENDING',
    "parsedData" JSONB,
    "supersededByDocumentId" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentEmbedding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "contentChunk" TEXT NOT NULL,
    "embeddingJson" JSONB NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRecommendation" (
    "id" TEXT NOT NULL,
    "agent" "AgentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMProviderConfig" (
    "id" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "baseUrl" TEXT,
    "modelName" TEXT NOT NULL,
    "supportsVision" BOOLEAN NOT NULL DEFAULT false,
    "status" "LLMConfigStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LLMProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentModelAssignment" (
    "id" TEXT NOT NULL,
    "agent" "AgentType" NOT NULL,
    "llmProviderConfigId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentModelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "actor" TEXT NOT NULL DEFAULT 'USER',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL DEFAULT 'user',

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "snowballStrategy" "SnowballStrategy" NOT NULL DEFAULT 'SNOWBALL',
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyDataConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windeedUsername" TEXT,
    "windeedPasswordEnc" TEXT,
    "windeedStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "lightstoneApiKeyEnc" TEXT,
    "lightstoneStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyDataConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerType" "BankConnectionProviderType" NOT NULL,
    "providerName" TEXT NOT NULL,
    "consentStatus" "BankConnectionConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentGrantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentExpiresAt" TIMESTAMP(3),
    "accessTokenEncrypted" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "syncFrequency" "SyncFrequency" NOT NULL DEFAULT 'ON_DEMAND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Debt_accountId_key" ON "Debt"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentModelAssignment_agent_key" ON "AgentModelAssignment"("agent");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyDataConfig_userId_key" ON "PropertyDataConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_accountId_key" ON "BankConnection"("accountId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeEvent" ADD CONSTRAINT "IncomeEvent_incomeId_fkey" FOREIGN KEY ("incomeId") REFERENCES "Income"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementEvent" ADD CONSTRAINT "SettlementEvent_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_relatedEntityId_fkey" FOREIGN KEY ("relatedEntityId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentEmbedding" ADD CONSTRAINT "DocumentEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentModelAssignment" ADD CONSTRAINT "AgentModelAssignment_llmProviderConfigId_fkey" FOREIGN KEY ("llmProviderConfigId") REFERENCES "LLMProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_account_fkey" FOREIGN KEY ("entityId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_debt_fkey" FOREIGN KEY ("entityId") REFERENCES "Debt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_income_fkey" FOREIGN KEY ("entityId") REFERENCES "Income"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyDataConfig" ADD CONSTRAINT "PropertyDataConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

