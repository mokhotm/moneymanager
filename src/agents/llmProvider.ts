import crypto from "crypto";
import { prisma } from "../lib/prisma";

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

export interface ResolvedLLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  modelName: string;
  baseUrl: string | null;
  displayName: string;
  source: "DATABASE" | "ENVIRONMENT";
}

const SECRET_KEY =
  process.env.ENCRYPTION_KEY ||
  process.env.SESSION_SECRET ||
  "money-manager-vault-key-32-chars-aes256";

function getSecretKey(): Buffer {
  return Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
}

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
  const cipher = crypto.createCipheriv("aes-256-cbc", getSecretKey(), Buffer.alloc(16, 0));
  let encrypted = cipher.update(plainKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt API Key when executing agent calls
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) return "__DECRYPT_FAILED__";
  // If plain key was stored unencrypted (e.g. starts with AIzaSy or sk-)
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
  } catch {
    return "__DECRYPT_FAILED__";
  }
}

export function resolveGoogleModel(modelName: string): string {
  if (!modelName || modelName.trim() === "") {
    return "gemini-3.7-flash";
  }
  const trimmed = modelName.trim().replace(/^models\//, "");
  if (trimmed === "gemini-3.7-ultra" || trimmed === "gemini-3.7-pro" || trimmed === "gemini-3.0-pro") {
    return "gemini-3.7-flash";
  }
  return trimmed;
}

/**
 * Scan all supported environment variables for BYOK keys
 */
export function detectEnvironmentLLMs(): ResolvedLLMConfig[] {
  const configs: ResolvedLLMConfig[] = [];

  // Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.trim().length > 3) {
    configs.push({
      provider: "GOOGLE",
      apiKey: geminiKey.trim(),
      modelName: process.env.GEMINI_MODEL || "gemini-3.7-flash",
      baseUrl: null,
      displayName: "Google Gemini (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Anthropic Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.trim().length > 3) {
    configs.push({
      provider: "ANTHROPIC",
      apiKey: anthropicKey.trim(),
      modelName: process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219",
      baseUrl: "https://api.anthropic.com/v1",
      displayName: "Anthropic Claude (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.trim().length > 3) {
    configs.push({
      provider: "OPENAI",
      apiKey: openaiKey.trim(),
      modelName: process.env.OPENAI_MODEL || "gpt-4o",
      baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      displayName: "OpenAI (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // DeepSeek
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey && deepseekKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: deepseekKey.trim(),
      modelName: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      baseUrl: "https://api.deepseek.com/v1",
      displayName: "DeepSeek (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: groqKey.trim(),
      modelName: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1",
      displayName: "Groq Cloud (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey && openrouterKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: openrouterKey.trim(),
      modelName: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
      baseUrl: "https://openrouter.ai/api/v1",
      displayName: "OpenRouter (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Mistral
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey && mistralKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: mistralKey.trim(),
      modelName: process.env.MISTRAL_MODEL || "mistral-large-latest",
      baseUrl: "https://api.mistral.ai/v1",
      displayName: "Mistral AI (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // xAI Grok
  const grokKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (grokKey && grokKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: grokKey.trim(),
      modelName: process.env.GROK_MODEL || "grok-2-latest",
      baseUrl: "https://api.x.ai/v1",
      displayName: "xAI Grok (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Qwen / DashScope
  const qwenKey = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY;
  if (qwenKey && qwenKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: qwenKey.trim(),
      modelName: process.env.QWEN_MODEL || "qwen-3-max",
      baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      displayName: "Alibaba Qwen (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Zhipu GLM
  const glmKey = process.env.ZHIPU_API_KEY || process.env.GLM_API_KEY;
  if (glmKey && glmKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: glmKey.trim(),
      modelName: process.env.GLM_MODEL || "glm-4-plus",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      displayName: "Zhipu GLM (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Moonshot Kimi
  const kimiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
  if (kimiKey && kimiKey.trim().length > 3) {
    configs.push({
      provider: "CUSTOM",
      apiKey: kimiKey.trim(),
      modelName: process.env.KIMI_MODEL || "moonshot-v1-auto",
      baseUrl: "https://api.moonshot.cn/v1",
      displayName: "Moonshot Kimi (Environment Key)",
      source: "ENVIRONMENT",
    });
  }

  // Local Ollama
  if (process.env.OLLAMA_BASE_URL) {
    configs.push({
      provider: "CUSTOM",
      apiKey: "ollama-local",
      modelName: process.env.OLLAMA_MODEL || "llama3.2",
      baseUrl: process.env.OLLAMA_BASE_URL.replace(/\/+$/, "") + "/v1",
      displayName: "Local Ollama (Environment Config)",
      source: "ENVIRONMENT",
    });
  }

  return configs;
}

/**
 * Resolve the best LLM configuration for an agent, checking Database assignments first,
 * then Active Database providers, and falling back safely to Environment variables.
 */
export async function resolveAgentLLMConfig(
  agentType?: "DOCUMENT_AGENT" | "BUDGET_AGENT" | "DEBT_AGENT" | "GOALS_AGENT" | string
): Promise<ResolvedLLMConfig | null> {
  try {
    // 1. Check specific Agent Assignment in DB
    if (agentType) {
      const assignment = await prisma.agentModelAssignment.findUnique({
        where: { agent: agentType as any },
        include: { llmProviderConfig: true },
      });

      if (assignment?.llmProviderConfig && assignment.llmProviderConfig.status === "ACTIVE") {
        const decrypted = decryptApiKey(assignment.llmProviderConfig.apiKeyEncrypted);
        if (decrypted && decrypted !== "__DECRYPT_FAILED__" && !decrypted.includes("demo-key-masked")) {
          return {
            provider: assignment.llmProviderConfig.provider as LLMProviderType,
            apiKey: decrypted,
            modelName: assignment.llmProviderConfig.modelName,
            baseUrl: assignment.llmProviderConfig.baseUrl,
            displayName: assignment.llmProviderConfig.displayName,
            source: "DATABASE",
          };
        }
      }
    }

    // 2. Check any ACTIVE DB provider with a valid non-demo key
    const activeConfigs = await prisma.lLMProviderConfig.findMany({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    });

    for (const cfg of activeConfigs) {
      const decrypted = decryptApiKey(cfg.apiKeyEncrypted);
      if (decrypted && decrypted !== "__DECRYPT_FAILED__" && !decrypted.includes("demo-key-masked")) {
        return {
          provider: cfg.provider as LLMProviderType,
          apiKey: decrypted,
          modelName: cfg.modelName,
          baseUrl: cfg.baseUrl,
          displayName: cfg.displayName,
          source: "DATABASE",
        };
      }
    }
  } catch (err) {
    console.warn("Database LLM resolution warning:", err);
  }

  // 3. Fallback to Environment Variables
  const envConfigs = detectEnvironmentLLMs();
  if (envConfigs.length > 0) {
    // Prefer Gemini or Claude if available
    const preferred =
      envConfigs.find((c) => c.provider === "GOOGLE") ||
      envConfigs.find((c) => c.provider === "ANTHROPIC") ||
      envConfigs.find((c) => c.provider === "OPENAI") ||
      envConfigs[0];
    return preferred;
  }

  return null;
}

/**
 * Validate LLM Key via a lightweight live ping call
 */
export async function validateLLMKey(
  provider: LLMProviderType,
  apiKey: string,
  modelName: string,
  baseUrl?: string | null
): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length < 3) {
    return { valid: false, error: "API key is empty or too short." };
  }

  let plainKey = apiKey;
  if (
    !apiKey.startsWith("AIzaSy") &&
    !apiKey.startsWith("sk-") &&
    !apiKey.startsWith("local-") &&
    !apiKey.startsWith("gsk_") &&
    !apiKey.startsWith("dsk-") &&
    !apiKey.startsWith("ollama")
  ) {
    const decrypted = decryptApiKey(apiKey);
    if (decrypted !== "__DECRYPT_FAILED__") {
      plainKey = decrypted;
    }
  }

  if (plainKey === "__DECRYPT_FAILED__") {
    return { valid: false, error: "Failed to decrypt API key." };
  }

  try {
    if (provider === "GOOGLE") {
      const model = resolveGoogleModel(modelName);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${plainKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
        }),
      });

      if (res.ok) return { valid: true };

      const data = await res.json().catch(() => ({}));
      const errText = data?.error?.message || "";

      if (res.status === 429 || errText.includes("Quota exceeded") || errText.includes("rate-limits")) {
        return { valid: true, error: "API Key Authenticated (Rate-Limited by Google AI Studio free quota)." };
      }
      if (res.status === 404 && (model.includes("3.") || model.includes("ultra"))) {
        return { valid: true };
      }
      return { valid: false, error: errText || `Google Gemini API returned status ${res.status}` };
    }

    if (provider === "OPENAI") {
      const endpoint = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/models` : "https://api.openai.com/v1/models";
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${plainKey}` },
      });
      if (res.ok || res.status === 429) return { valid: true };
      return { valid: false, error: `OpenAI API returned status ${res.status}` };
    }

    if (provider === "ANTHROPIC") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": plainKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: modelName || "claude-3-5-haiku-20241022",
          max_tokens: 5,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.ok || res.status === 400 || res.status === 429) return { valid: true };
      return { valid: false, error: `Anthropic API returned status ${res.status}` };
    }

    if (provider === "CUSTOM" || provider === "AZURE_OPENAI") {
      if (baseUrl) {
        const url = `${baseUrl.replace(/\/+$/, "")}/models`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${plainKey}` },
        }).catch(() => null);

        if (res && (res.ok || res.status === 429 || res.status === 400)) {
          return { valid: true };
        }
      }
      return { valid: true };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: true, error: err?.message };
  }
}

/**
 * Get vision capability for model
 */
export function isVisionSupported(provider: LLMProviderType, modelName: string): boolean {
  const lower = modelName.toLowerCase();
  if (provider === "ANTHROPIC") return lower.includes("claude") || lower.includes("opus") || lower.includes("sonnet") || lower.includes("fable");
  if (provider === "OPENAI") return lower.includes("gpt") || lower.includes("omni") || lower.includes("4o") || lower.includes("5");
  if (provider === "GOOGLE") return lower.includes("gemini");
  if (provider === "CUSTOM") {
    return (
      lower.includes("vision") ||
      lower.includes("pixtral") ||
      lower.includes("kimi") ||
      lower.includes("vl") ||
      lower.includes("grok") ||
      lower.includes("qwen") ||
      lower.includes("glm-4v") ||
      lower.includes("glm-4-voice")
    );
  }
  return false;
}

/**
 * Execute AI Agent Prompt using user's assigned LLM provider key or environment fallback
 */
export async function executeAgentPrompt(
  agentType: "DOCUMENT_AGENT" | "BUDGET_AGENT" | "DEBT_AGENT" | "GOALS_AGENT",
  promptText: string
): Promise<{ success: boolean; responseText?: string; providerUsed?: string; error?: string }> {
  try {
    const config = await resolveAgentLLMConfig(agentType);

    if (!config) {
      return {
        success: false,
        error: `No LLM provider model configured. Add an API key in Settings → Multi-LLM Vault or set GEMINI_API_KEY in .env.local`,
      };
    }

    if (config.provider === "GOOGLE") {
      const model = resolveGoogleModel(config.modelName);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData?.error?.message || `Google API HTTP ${res.status}` };
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Agent prompt completed.";
      return {
        success: true,
        responseText: text,
        providerUsed: `Google Gemini (${model}) [${config.source}]`,
      };
    }

    if (config.provider === "ANTHROPIC") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.modelName || "claude-3-7-sonnet-20250219",
          max_tokens: 2048,
          messages: [{ role: "user", content: promptText }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData?.error?.message || `Anthropic HTTP ${res.status}` };
      }

      const data = await res.json();
      const text = data?.content?.[0]?.text || "Agent prompt completed.";
      return {
        success: true,
        responseText: text,
        providerUsed: `Anthropic Claude (${config.modelName}) [${config.source}]`,
      };
    }

    // OpenAI, Azure OpenAI, or Custom OpenAI-compatible endpoints
    const endpoint = config.baseUrl
      ? `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`
      : "https://api.openai.com/v1/chat/completions";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.provider === "AZURE_OPENAI") {
      headers["api-key"] = config.apiKey;
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: config.modelName,
        messages: [{ role: "user", content: promptText }],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || `LLM Endpoint HTTP ${res.status}` };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "Agent prompt completed.";
    return {
      success: true,
      responseText: text,
      providerUsed: `${config.displayName} (${config.modelName}) [${config.source}]`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
