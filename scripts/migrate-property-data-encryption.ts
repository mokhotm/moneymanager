import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  const trimmed = raw.trim();
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const asBase64 = Buffer.from(trimmed, "base64");
  if (asBase64.length === 32 && asBase64.toString("base64").replace(/=+$/, "") === trimmed.replace(/=+$/, "")) {
    return asBase64;
  }

  const asUtf8 = Buffer.from(raw, "utf8");
  if (asUtf8.length === 32) {
    return asUtf8;
  }

  throw new Error("ENCRYPTION_KEY must be 32-byte UTF-8, 64-char hex, or base64-encoded 32 bytes");
}

function encryptV2(plain: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptV2(ciphertext: string, key: Buffer): string {
  const [ivHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !dataHex) {
    throw new Error("Invalid v2 ciphertext");
  }
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

function decryptLegacy(ciphertext: string, key: Buffer): string {
  const legacyIV = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, legacyIV);
  return decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const key = getEncryptionKey();

  const rows = await prisma.propertyDataConfig.findMany({
    select: {
      id: true,
      userId: true,
      windeedPasswordEnc: true,
      lightstoneApiKeyEnc: true,
    },
  });

  let updatedRows = 0;
  let migratedFields = 0;
  let skipped = 0;

  for (const row of rows) {
    const updateData: { windeedPasswordEnc?: string; lightstoneApiKeyEnc?: string } = {};

    const maybeMigrate = (value: string | null): string | null => {
      if (!value) return null;

      if (value.includes(":")) {
        // Already v2 format; validate decryptability and keep as-is.
        decryptV2(value, key);
        return null;
      }

      const plain = decryptLegacy(value, key);
      return encryptV2(plain, key);
    };

    try {
      const nextWindeed = maybeMigrate(row.windeedPasswordEnc);
      if (nextWindeed) {
        updateData.windeedPasswordEnc = nextWindeed;
        migratedFields += 1;
      }

      const nextLightstone = maybeMigrate(row.lightstoneApiKeyEnc);
      if (nextLightstone) {
        updateData.lightstoneApiKeyEnc = nextLightstone;
        migratedFields += 1;
      }
    } catch (error: any) {
      skipped += 1;
      console.warn(`Skipping row ${row.id} (${row.userId}): ${error.message}`);
      continue;
    }

    if (Object.keys(updateData).length > 0) {
      updatedRows += 1;
      if (apply) {
        await prisma.propertyDataConfig.update({
          where: { id: row.id },
          data: updateData,
        });
      }
    }
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    totalRows: rows.length,
    updatedRows,
    migratedFields,
    skipped,
  }, null, 2));

  if (!apply) {
    console.log("Run again with --apply to persist migrated values.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
