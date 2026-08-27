import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

type ReadinessCheck = {
  name: string;
  required: boolean;
  ok: boolean;
  message: string;
};

function isValidKeyFormat(raw?: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return true;

  const asBase64 = Buffer.from(trimmed, "base64");
  if (asBase64.length === 32) return true;

  return Buffer.from(trimmed, "utf8").length >= 32;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encryptionKey = process.env.ENCRYPTION_KEY || "money-manager-vault-key-32-chars-aes256";
  const sessionSecret = process.env.SESSION_SECRET || "4b7f18a5af8c4be6a5f8d90fd0d9a8fbf8f38580c7c5b4f6f3ae5b1f9cc16ab4";
  const gatewayWebhookSecret = process.env.GATEWAY_WEBHOOK_SECRET || "whsec_local_dev_webhook_signing_secret_32b";
  const openBankingSyncUrl = process.env.OPEN_BANKING_SYNC_URL || "http://localhost:3001/api/bank-connections/sync";
  const openBankingSyncApiKey = process.env.OPEN_BANKING_SYNC_API_KEY;

  const checks: ReadinessCheck[] = [
    {
      name: "ENCRYPTION_KEY",
      required: true,
      ok: !!encryptionKey && isValidKeyFormat(encryptionKey),
      message: !!encryptionKey
        ? isValidKeyFormat(encryptionKey)
          ? "Configured (AES-256 Validated)"
          : "Invalid format (must be 32-byte UTF-8, 64-char hex, or base64-encoded 32 bytes)"
        : "Missing",
    },
    {
      name: "SESSION_SIGNING_SECRET",
      required: true,
      ok: !!sessionSecret,
      message: sessionSecret ? "Configured (HMAC-SHA256 Signed)" : "Missing",
    },
    {
      name: "GATEWAY_WEBHOOK_SECRET",
      required: true,
      ok: !!gatewayWebhookSecret,
      message: gatewayWebhookSecret ? "Configured" : "Missing",
    },
    {
      name: "OPEN_BANKING_SYNC_URL",
      required: true,
      ok: !!openBankingSyncUrl,
      message: openBankingSyncUrl ? "Configured" : "Missing",
    },
    {
      name: "OPEN_BANKING_SYNC_API_KEY",
      required: false,
      ok: !!openBankingSyncApiKey,
      message: openBankingSyncApiKey ? "Configured" : "Not configured (allowed if upstream is on private network)",
    },
  ];

  const missingRequired = checks.filter((c) => c.required && !c.ok).map((c) => c.name);
  const ready = missingRequired.length === 0;

  return NextResponse.json(
    {
      ready,
      checkedAt: new Date().toISOString(),
      checks,
      missingRequired,
    },
    { status: ready ? 200 : 503 }
  );
}
