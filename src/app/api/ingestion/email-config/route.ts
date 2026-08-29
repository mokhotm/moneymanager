import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import {
  EMAIL_PROVIDER_PRESETS,
  encryptPassword,
  maskPassword,
} from "@/services/emailIngestionService";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let config: any = null;
    try {
      if ((prisma as any).emailScannerConfig?.findUnique) {
        config = await (prisma as any).emailScannerConfig.findUnique({
          where: { userId },
        });
      } else {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "EmailScannerConfig" WHERE "userId" = $1 LIMIT 1`,
          userId
        );
        config = rows[0] || null;
      }
    } catch (e) {
      console.warn("Prisma fallback for GET EmailScannerConfig:", e);
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "EmailScannerConfig" WHERE "userId" = $1 LIMIT 1`,
          userId
        );
        config = rows[0] || null;
      } catch (err2) {
        console.error("Direct SQL GET error:", err2);
      }
    }

    const profileEmail = user.email || "";
    const sovereignAlias = `${user.username}-vault@inbound.moneymanager.local`;

    return NextResponse.json({
      config: {
        provider: config?.provider || "GMAIL",
        emailAddress: config?.emailAddress || profileEmail,
        imapHost: config?.imapHost || "imap.gmail.com",
        imapPort: config?.imapPort || 993,
        useSsl: config?.useSsl ?? true,
        mailboxFolder: config?.mailboxFolder || "INBOX",
        syncFrequency: config?.syncFrequency || "ON_DEMAND",
        status: config?.status || "DISCONNECTED",
        lastScannedAt: config?.lastScannedAt || null,
        lastScanResult: config?.lastScanResult || null,
        autoSyncEnabled: config?.autoSyncEnabled ?? true,
        isPasswordConfigured: Boolean(config?.passwordEncrypted),
        passwordMasked: maskPassword(config?.passwordEncrypted),
      },
      profileEmail,
      sovereignAlias,
      presets: EMAIL_PROVIDER_PRESETS,
    });
  } catch (error: any) {
    console.error("Fetch email config error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch email scanner config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      provider = "GMAIL",
      emailAddress,
      imapHost = "imap.gmail.com",
      imapPort = 993,
      useSsl = true,
      password,
      mailboxFolder = "INBOX",
      syncFrequency = "ON_DEMAND",
      autoSyncEnabled = true,
    } = body;

    const finalEmail = (emailAddress || user.email || "").trim();

    // Fetch existing config to preserve encrypted password if none supplied
    let existing: any = null;
    try {
      if ((prisma as any).emailScannerConfig?.findUnique) {
        existing = await (prisma as any).emailScannerConfig.findUnique({
          where: { userId },
        });
      } else {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "EmailScannerConfig" WHERE "userId" = $1 LIMIT 1`,
          userId
        );
        existing = rows[0] || null;
      }
    } catch (e) {
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM "EmailScannerConfig" WHERE "userId" = $1 LIMIT 1`,
          userId
        );
        existing = rows[0] || null;
      } catch (err2) {
        console.warn("Could not query existing config:", err2);
      }
    }

    let passwordEncrypted = existing?.passwordEncrypted || null;
    if (password && password.trim().length > 0) {
      passwordEncrypted = encryptPassword(password.trim());
    }

    const status = passwordEncrypted ? "CONNECTED" : "DISCONNECTED";
    const portNum = Number(imapPort) || 993;
    const sslBool = Boolean(useSsl);
    const autoSyncBool = Boolean(autoSyncEnabled);

    let updatedConfig: any = null;
    try {
      if ((prisma as any).emailScannerConfig?.upsert) {
        updatedConfig = await (prisma as any).emailScannerConfig.upsert({
          where: { userId },
          create: {
            userId,
            provider,
            emailAddress: finalEmail,
            imapHost,
            imapPort: portNum,
            useSsl: sslBool,
            passwordEncrypted,
            mailboxFolder,
            syncFrequency: String(syncFrequency),
            status,
            autoSyncEnabled: autoSyncBool,
          },
          update: {
            provider,
            emailAddress: finalEmail,
            imapHost,
            imapPort: portNum,
            useSsl: sslBool,
            passwordEncrypted,
            mailboxFolder,
            syncFrequency: String(syncFrequency),
            status,
            autoSyncEnabled: autoSyncBool,
          },
        });
      }
    } catch (upsertErr) {
      console.warn("Prisma delegate upsert failed, using SQL fallback:", upsertErr);
    }

    if (!updatedConfig) {
      // Direct raw SQL upsert
      const configId = existing?.id || randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "EmailScannerConfig" ("id", "userId", "provider", "emailAddress", "imapHost", "imapPort", "useSsl", "passwordEncrypted", "mailboxFolder", "syncFrequency", "status", "autoSyncEnabled", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
         ON CONFLICT ("userId") DO UPDATE SET
           "provider" = EXCLUDED."provider",
           "emailAddress" = EXCLUDED."emailAddress",
           "imapHost" = EXCLUDED."imapHost",
           "imapPort" = EXCLUDED."imapPort",
           "useSsl" = EXCLUDED."useSsl",
           "passwordEncrypted" = EXCLUDED."passwordEncrypted",
           "mailboxFolder" = EXCLUDED."mailboxFolder",
           "syncFrequency" = EXCLUDED."syncFrequency",
           "status" = EXCLUDED."status",
           "autoSyncEnabled" = EXCLUDED."autoSyncEnabled",
           "updatedAt" = NOW()`,
        configId,
        userId,
        provider,
        finalEmail,
        imapHost,
        portNum,
        sslBool,
        passwordEncrypted,
        mailboxFolder,
        String(syncFrequency),
        status,
        autoSyncBool
      );

      updatedConfig = {
        provider,
        emailAddress: finalEmail,
        imapHost,
        imapPort: portNum,
        useSsl: sslBool,
        mailboxFolder,
        syncFrequency,
        status,
        lastScannedAt: existing?.lastScannedAt || null,
        autoSyncEnabled: autoSyncBool,
        passwordEncrypted,
      };
    }

    return NextResponse.json({
      success: true,
      message: "Email scanner settings updated successfully.",
      config: {
        provider: updatedConfig.provider,
        emailAddress: updatedConfig.emailAddress,
        imapHost: updatedConfig.imapHost,
        imapPort: updatedConfig.imapPort,
        useSsl: updatedConfig.useSsl,
        mailboxFolder: updatedConfig.mailboxFolder,
        syncFrequency: updatedConfig.syncFrequency,
        status: updatedConfig.status,
        lastScannedAt: updatedConfig.lastScannedAt,
        autoSyncEnabled: updatedConfig.autoSyncEnabled,
        isPasswordConfigured: Boolean(updatedConfig.passwordEncrypted),
        passwordMasked: maskPassword(updatedConfig.passwordEncrypted),
      },
    });
  } catch (error: any) {
    console.error("Save email config error:", error);
    return NextResponse.json({ error: error.message || "Failed to update email scanner config" }, { status: 500 });
  }
}
