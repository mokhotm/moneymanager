const crypto = require("crypto");
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
    const decipher = crypto.createDecipheriv("aes-256-cbc", getSecretKey(), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedKey, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return "__DECRYPT_FAILED__";
  }
}

async function debugLLM() {
  console.log("=== ALL LLM PROVIDER CONFIGS IN DB ===");
  const allConfigs = await prisma.lLMProviderConfig.findMany();
  for (const c of allConfigs) {
    const decrypted = decryptApiKey(c.apiKeyEncrypted);
    console.log(`- Provider: ${c.provider} | Name: ${c.displayName} | Status: ${c.status} | Model: ${c.modelName} | RawEnc: ${c.apiKeyEncrypted.slice(0,16)}... | Decrypted: ${decrypted.slice(0, 8)}... (len: ${decrypted.length})`);
  }

  console.log("\n=== ALL AGENT MODEL ASSIGNMENTS IN DB ===");
  const assignments = await prisma.agentModelAssignment.findMany({
    include: { llmProviderConfig: true }
  });
  for (const a of assignments) {
    console.log(`- Agent: ${a.agent} | Provider: ${a.llmProviderConfig?.provider} | Status: ${a.llmProviderConfig?.status}`);
  }
}

debugLLM()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
  });
