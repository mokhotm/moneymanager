import pg from "pg";

const connectionString = "postgresql://sqamtho:$qamth0%232025@localhost:5432/money_manager";

async function createTables() {
  console.log("Connecting to PostgreSQL database money_manager...");
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to money_manager PostgreSQL database.");

    // Enums
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "AccountType" AS ENUM ('CURRENT', 'CREDIT_CARD', 'LOAN', 'MUNICIPAL', 'SERVICE_ACCOUNT', 'SAVINGS', 'INVESTMENT', 'RETIREMENT', 'PROPERTY');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "BalanceConfidence" AS ENUM ('CONFIRMED', 'ESTIMATED', 'UNKNOWN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "PaymentMode" AS ENUM ('MINIMUM_ONLY', 'FIXED_INSTALMENT', 'FIXED_TERM_LOAN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "UrgencyFlag" AS ENUM ('NONE', 'SERVICE_INTERRUPTION_RISK', 'LEGAL_ACTION_RISK', 'CREDIT_BUREAU_RISK');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "DebtStatus" AS ENUM ('ACTIVE', 'PAID_OFF', 'SETTLED_BY_INSURANCE', 'WRITTEN_OFF');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "DebtCategory" AS ENUM ('SHORT_TERM', 'LONG_TERM');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "SnowballStrategy" AS ENUM ('SNOWBALL', 'AVALANCHE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "IncomeConfidence" AS ENUM ('CONFIRMED', 'ESTIMATED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "RecommendedUse" AS ENUM ('DEBT_PAYDOWN', 'GOAL_CONTRIBUTION', 'EMERGENCY_FUND', 'UNALLOCATED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "BudgetCategory" AS ENUM ('FIXED_HOUSEHOLD_OBLIGATIONS', 'DEBT_ACCELERATION_PLAN', 'GOAL_CONTRIBUTIONS', 'FAMILY_AND_DISCRETIONARY', 'ONE_OFF_UNEXPECTED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "DocumentType" AS ENUM ('BANK_STATEMENT', 'PAYSLIP', 'INVOICE', 'MUNICIPAL_BILL', 'INVESTMENT_STATEMENT', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "RelatedEntityType" AS ENUM ('ACCOUNT', 'DEBT', 'INCOME', 'ASSET');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "AssetType" AS ENUM ('PROPERTY', 'VEHICLE', 'INVESTMENT_PORTFOLIO', 'RETIREMENT_FUND', 'CASH', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "GoalType" AS ENUM ('EMERGENCY_FUND', 'DEBT_FREE_BY_DATE', 'HOUSE_DEPOSIT', 'RETIREMENT_INVESTMENT', 'EDUCATION_FUND', 'MAJOR_PURCHASE', 'CUSTOM');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED', 'ABANDONED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "AgentType" AS ENUM ('DOCUMENT_AGENT', 'BUDGET_AGENT', 'DEBT_AGENT', 'GOALS_AGENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "ParseStatus" AS ENUM ('PENDING', 'PARSED_AWAITING_REVIEW', 'APPLIED', 'REJECTED_DUPLICATE', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "SnapshotGeneratedBy" AS ENUM ('SCHEDULED', 'MANUAL', 'AGENT_TRIGGERED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "LLMProvider" AS ENUM ('ANTHROPIC', 'OPENAI', 'GOOGLE', 'AZURE_OPENAI', 'CUSTOM');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "LLMConfigStatus" AS ENUM ('ACTIVE', 'INVALID_KEY', 'UNVERIFIED', 'DISABLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // LLMProviderConfig table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LLMProviderConfig" (
        "id" TEXT PRIMARY KEY,
        "provider" "LLMProvider" NOT NULL,
        "displayName" TEXT NOT NULL,
        "apiKeyEncrypted" TEXT NOT NULL,
        "baseUrl" TEXT,
        "modelName" TEXT NOT NULL,
        "supportsVision" BOOLEAN NOT NULL DEFAULT false,
        "status" "LLMConfigStatus" NOT NULL DEFAULT 'UNVERIFIED',
        "lastValidatedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // AgentModelAssignment table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "AgentModelAssignment" (
        "id" TEXT PRIMARY KEY,
        "agent" "AgentType" UNIQUE NOT NULL,
        "llmProviderConfigId" TEXT NOT NULL REFERENCES "LLMProviderConfig"("id") ON DELETE CASCADE,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // DocumentEmbedding table (NEW Vector Embeddings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "DocumentEmbedding" (
        "id" TEXT PRIMARY KEY,
        "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
        "contentChunk" TEXT NOT NULL,
        "embeddingJson" JSONB NOT NULL,
        "metadataJson" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Ensure debtCategory column exists on Debt table
    await client.query(`
      ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "debtCategory" "DebtCategory" NOT NULL DEFAULT 'SHORT_TERM';
    `);

    console.log("PostgreSQL schema updated with DocumentEmbedding table!");
  } catch (err: any) {
    console.error("Error creating tables:", err.message);
  } finally {
    await client.end();
  }
}

createTables();
