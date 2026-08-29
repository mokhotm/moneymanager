const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const possibleKeys = [
  "money-manager-vault-key-32-chars-aes256",
  "money-mgmt-enc-key-change-in-prod-32bytes",
  "money-mgmt-session-secret-change-in-prod-32bytes",
  process.env.ENCRYPTION_KEY || "",
  process.env.SESSION_SECRET || "",
];

function tryDecrypt(encHex, secret) {
  try {
    const keyBuf = Buffer.from(secret.padEnd(32).slice(0, 32));
    const decipher = crypto.createDecipheriv("aes-256-cbc", keyBuf, Buffer.alloc(16, 0));
    let dec = decipher.update(encHex, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch (e) {
    return null;
  }
}

async function main() {
  const configs = await prisma.lLMProviderConfig.findMany();
  for (const c of configs) {
    console.log(`\nProvider: ${c.provider} | Name: ${c.displayName} | Status: ${c.status}`);
    console.log(`Encrypted Hex: ${c.apiKeyEncrypted}`);
    
    let decryptedFound = null;
    for (const k of possibleKeys) {
      if (!k) continue;
      const res = tryDecrypt(c.apiKeyEncrypted, k);
      if (res) {
        decryptedFound = { secret: k, val: res };
        break;
      }
    }
    
    if (decryptedFound) {
      console.log(`-> SUCCESS with key "${decryptedFound.secret}": "${decryptedFound.val}"`);
    } else {
      console.log(`-> FAILED with all known keys`);
    }
  }
}

main().then(() => prisma.$disconnect()).catch(console.error);
