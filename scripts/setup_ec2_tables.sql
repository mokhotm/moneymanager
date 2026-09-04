CREATE TABLE IF NOT EXISTS "EmailScannerConfig" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL DEFAULT 'GMAIL',
  "emailAddress" TEXT NOT NULL,
  "imapHost" TEXT NOT NULL DEFAULT 'imap.gmail.com',
  "imapPort" INTEGER NOT NULL DEFAULT 993,
  "useSsl" BOOLEAN NOT NULL DEFAULT true,
  "passwordEncrypted" TEXT,
  "mailboxFolder" TEXT NOT NULL DEFAULT 'INBOX',
  "syncFrequency" TEXT NOT NULL DEFAULT 'ON_DEMAND',
  "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
  "lastScannedAt" TIMESTAMP,
  "lastScanResult" JSONB,
  "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "InboundEmailLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sender" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "receivedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "channel" TEXT NOT NULL DEFAULT 'IMAP_SCAN',
  "detectedInstitution" TEXT NOT NULL DEFAULT 'Universal Bank',
  "documentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUCCESS',
  "summary" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "InboundEmailLog_userId_idx" ON "InboundEmailLog"("userId");
CREATE INDEX IF NOT EXISTS "InboundEmailLog_receivedAt_idx" ON "InboundEmailLog"("receivedAt");

-- Goal-to-Budget Linking & AI Feasibility columns
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "linkToBudget" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "autoAllocateSurplus" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "allocatedBudgetAmount" DECIMAL(65, 30) DEFAULT 0;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "aiFeasibilityScore" INTEGER;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "aiShouldAllocate" BOOLEAN;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "aiRecommendedAllocation" DECIMAL(65, 30);
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "aiEvaluationSummary" TEXT;
ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS "aiLastEvaluatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX IF NOT EXISTS "Goal_status_idx" ON "Goal"("status");
CREATE INDEX IF NOT EXISTS "Goal_linkToBudget_idx" ON "Goal"("linkToBudget");

-- UserAgentMemory Table & Indexes for Continuous Agent Learning Flywheel
CREATE TABLE IF NOT EXISTS "UserAgentMemory" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "learnedPattern" TEXT NOT NULL,
  "resolvedValue" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "source" TEXT NOT NULL DEFAULT 'USER_CORRECTION',
  "usageCount" INTEGER NOT NULL DEFAULT 1,
  "lastUsedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAgentMemory_userId_domain_key_key" ON "UserAgentMemory"("userId", "domain", "key");
CREATE INDEX IF NOT EXISTS "UserAgentMemory_userId_domain_idx" ON "UserAgentMemory"("userId", "domain");

