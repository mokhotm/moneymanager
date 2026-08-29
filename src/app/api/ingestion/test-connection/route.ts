import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { testImapConnection } from "@/services/emailIngestionService";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { host, port = 993, useSsl = true, username, password } = body;

    let targetPassword = password;

    // If password not provided in test request, check if user has encrypted password stored
    if (!targetPassword) {
      const config = await (prisma as any).emailScannerConfig?.findUnique({
        where: { userId },
      });
      if (config?.passwordEncrypted) {
        return NextResponse.json(
          await testImapConnection({
            host: host || config.imapHost,
            port: Number(port) || config.imapPort,
            useSsl: useSsl !== undefined ? useSsl : config.useSsl,
            username: username || config.emailAddress,
            passwordEncrypted: config.passwordEncrypted,
          })
        );
      }
      return NextResponse.json({ success: false, message: "No password provided to test IMAP connection." }, { status: 400 });
    }

    const result = await testImapConnection({
      host,
      port: Number(port),
      useSsl: Boolean(useSsl),
      username,
      rawPassword: targetPassword,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Test connection route error:", error);
    return NextResponse.json({ success: false, message: error.message || "Connection test failed." }, { status: 500 });
  }
}
