const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SECRET_KEY =
  process.env.ENCRYPTION_KEY ||
  process.env.SESSION_SECRET ||
  "money-manager-vault-key-32-chars-aes256";

function getSecretKey() {
  return Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
}

function decryptApiKey(encryptedKey) {
  if (!encryptedKey) return "__DECRYPT_FAILED__";
  if (
    encryptedKey.startsWith("AIzaSy") ||
    encryptedKey.startsWith("sk-") ||
    encryptedKey.startsWith("gsk_") ||
    encryptedKey.startsWith("dsk-") ||
    encryptedKey.startsWith("ms-")
  ) {
    return encryptedKey;
  }
  try {
    const crypto = require("crypto");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getSecretKey(), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedKey, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return "__DECRYPT_FAILED__";
  }
}

async function checkSavedKeys() {
  console.log("=== CHECKING SAVED LLM CONFIGS IN EC2 DATABASE ===");
  const configs = await prisma.lLMProviderConfig.findMany({
    orderBy: { updatedAt: "desc" }
  });

  for (const c of configs) {
    const decrypted = decryptApiKey(c.apiKeyEncrypted);
    const isValidRealKey = decrypted && !decrypted.includes("demo-key-masked") && decrypted !== "__DECRYPT_FAILED__";
    console.log(`\nProvider: ${c.provider}`);
    console.log(`Display Name: ${c.displayName}`);
    console.log(`Status: ${c.status}`);
    console.log(`Model: ${c.modelName}`);
    console.log(`Updated At: ${c.updatedAt.toISOString()}`);
    console.log(`Raw Hex Encrypted: ${c.apiKeyEncrypted.slice(0, 20)}... (len: ${c.apiKeyEncrypted.length})`);
    console.log(`Decrypted Prefix: ${decrypted.slice(0, 10)}... (len: ${decrypted.length})`);
    console.log(`Is Real Active Key: ${isValidRealKey ? 'YES' : 'NO'}`);
  }
}

checkSavedKeys().then(() => prisma.$disconnect()).catch(console.error);
