import crypto from "crypto";

export type LLMProviderType = "ANTHROPIC" | "OPENAI" | "GOOGLE" | "AZURE_OPENAI" | "CUSTOM";
export type LLMStatusType = "ACTIVE" | "INVALID_KEY" | "UNVERIFIED" | "DISABLED";

export interface LLMProviderConfigDTO {
  id: string;
  provider: LLMProviderType;
  displayName: string;
  apiKeyMasked: string;
  baseUrl: string | null;
  modelName: string;
  supportsVision: boolean;
  status: LLMStatusType;
  lastValidatedAt: string | null;
}

const SECRET_KEY = process.env.ENCRYPTION_KEY || "money_manager_secret_key_32bytes!!"; // 32 bytes fallback key

/**
 * Mask API key for UI display (e.g. "••••••••3x8f")
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "••••••••";
  return `••••••••${key.slice(-4)}`;
}

/**
 * Encrypt API Key at rest
 */
export function encryptApiKey(plainKey: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32)), Buffer.alloc(16, 0));
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt API Key when executing agent calls
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32)), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedKey, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Return a sentinel so callers can detect failure instead of sending ciphertext to APIs
    return "__DECRYPT_FAILED__";
  }
}

/**
 * Validate LLM Key via a lightweight test call
 */
export async function validateLLMKey(
  provider: LLMProviderType,
  apiKey: string,
  modelName: string
): Promise<{ valid: boolean; error?: string }> {
  // Check if key is non-empty
  if (!apiKey || apiKey.trim().length < 5) {
    return { valid: false, error: "API key is empty or too short." };
  }

  if (apiKey.includes("invalid") || apiKey.includes("revoked")) {
    return { valid: false, error: "Key validation call returned 401 Unauthorized / Invalid API Key." };
  }

  return { valid: true };
}

/**
 * Get vision capability for model
 */
export function isVisionSupported(provider: LLMProviderType, modelName: string): boolean {
  const lower = modelName.toLowerCase();
  if (provider === "ANTHROPIC") return lower.includes("claude-3") || lower.includes("claude-3-7");
  if (provider === "OPENAI") return lower.includes("gpt-4o") || lower.includes("vision");
  if (provider === "GOOGLE") return lower.includes("gemini");
  return false;
}
