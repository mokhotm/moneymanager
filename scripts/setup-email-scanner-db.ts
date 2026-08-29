import pg from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://sqamtho:$qamth0%232025@127.0.0.1:5432/money_manager?schema=public";

async function setupEmailScannerTables() {
  console.log("Setting up Email Scanner tables...");
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");

    // Create EmailScannerConfig table
    await client.query(`
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
        "syncFrequency" "SyncFrequency" NOT NULL DEFAULT 'ON_DEMAND',
        "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
        "lastScannedAt" TIMESTAMP,
        "lastScanResult" JSONB,
        "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create InboundEmailLog table
    await client.query(`
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
    `);

    console.log("EmailScannerConfig and InboundEmailLog tables verified/created successfully!");
  } catch (err: any) {
    console.error("Setup error:", err.message);
  } finally {
    await client.end();
  }
}

setupEmailScannerTables();
