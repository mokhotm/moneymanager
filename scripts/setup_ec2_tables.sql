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
