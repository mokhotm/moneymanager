"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Key,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Cpu,
  Lock,
  LogIn,
  Layers,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
  Zap,
  Sliders,
  Check,
  DollarSign,
  Gift,
  HardDrive,
  BrainCircuit,
  Eye as VisionIcon,
  ChevronDown,
  Globe,
  Flame,
  Edit2,
  X,
} from "lucide-react";

interface ProviderConfig {
  id: string;
  provider: string;
  displayName: string;
  apiKeyMasked: string;
  baseUrl: string | null;
  modelName: string;
  supportsVision: boolean;
  status: string;
  lastValidatedAt: string | null;
}

interface AgentAssignment {
  agent: string;
  configId: string;
  provider: string;
  displayName: string;
  modelName: string;
  supportsVision: boolean;
  status: string;
}

export type PricingCategory = "FREE_LOCAL" | "FREE_TIER" | "ULTRA_LOW_COST" | "PAID_API";

export interface ModelOption {
  id: string;
  label: string;
  badge?: "LATEST" | "FLAGSHIP" | "REASONING" | "FAST" | "FREE" | "VISION";
  badgeColor?: string;
}

interface LLMPreset {
  id: string;
  dbProvider: "GOOGLE" | "OPENAI" | "ANTHROPIC" | "AZURE_OPENAI" | "CUSTOM";
  label: string;
  color: string;
  pricingCategory: PricingCategory;
  pricingLabel: string;
  pricingBadgeColor: string;
  pricingDetails: string;
  defaultModel: string;
  defaultBaseUrl: string;
  placeholderKey: string;
  desc: string;
  models: ModelOption[];
}

const LLM_PRESETS: LLMPreset[] = [
  {
    id: "GOOGLE",
    dbProvider: "GOOGLE",
    label: "Google (Gemini 3.7 / 2.5)",
    color: "#f59e0b",
    pricingCategory: "FREE_TIER",
    pricingLabel: "Free Tier Available",
    pricingBadgeColor: "#10b981",
    pricingDetails: "Google AI Studio provides 15 RPM / 1,000,000 TPM free tier allowance for Gemini 2.0/2.5/3.x Flash models.",
    defaultModel: "gemini-3.7-flash",
    defaultBaseUrl: "",
    placeholderKey: "AIzaSy…",
    desc: "Google Gemini frontier models (Gemini 3.7 Flash, 2.5 Flash, 2.5 Pro, 2.0 Flash, 1.5 Pro). Multimodal with extreme speed and long context.",
    models: [
      { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash (Sub-Second Speed & Multimodal)", badge: "LATEST", badgeColor: "#f59e0b" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Fast & Efficient)", badge: "FAST", badgeColor: "#10b981" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Deep Reasoning)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Free Tier)", badge: "FREE", badgeColor: "#34d399" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (2M Context)", badge: "FLAGSHIP", badgeColor: "#64748b" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Ultra Fast)", badge: "FAST", badgeColor: "#10b981" },
    ],
  },
  {
    id: "ANTHROPIC",
    dbProvider: "ANTHROPIC",
    label: "Anthropic (Opus 4.8 / Claude 3.7)",
    color: "#a855f7",
    pricingCategory: "PAID_API",
    pricingLabel: "Paid API Credits",
    pricingBadgeColor: "#f59e0b",
    pricingDetails: "Requires prepaid Anthropic Console credit balance ($5+ top-up).",
    defaultModel: "claude-opus-4-8",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    placeholderKey: "sk-ant-api03-…",
    desc: "Anthropic frontier models (Claude Opus 4.8, Opus 4.6, Claude Fable 5, Sonnet 4.5, Claude 3.7 Sonnet). Hybrid thinking and long-form financial analysis.",
    models: [
      { id: "claude-opus-4-8", label: "Claude Opus 4.8 (Frontier Flagship)", badge: "LATEST", badgeColor: "#a855f7" },
      { id: "claude-opus-4-6", label: "Claude Opus 4.6 (Deep Reasoning)", badge: "FLAGSHIP", badgeColor: "#a855f7" },
      { id: "claude-fable-5", label: "Claude Fable 5 (Creative & Synthesis)", badge: "LATEST", badgeColor: "#ec4899" },
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 (Advanced Agentic)", badge: "FLAGSHIP", badgeColor: "#3b82f6" },
      { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet (Hybrid Thinking)", badge: "REASONING", badgeColor: "#8b5cf6" },
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet v2", badge: "FLAGSHIP", badgeColor: "#3b82f6" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Ultra Fast)", badge: "FAST", badgeColor: "#10b981" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus", badge: "FLAGSHIP", badgeColor: "#64748b" },
    ],
  },
  {
    id: "OPENAI",
    dbProvider: "OPENAI",
    label: "OpenAI (GPT-5.6 / GPT-5 / o3)",
    color: "#10b981",
    pricingCategory: "PAID_API",
    pricingLabel: "Paid API Credits",
    pricingBadgeColor: "#f59e0b",
    pricingDetails: "Requires prepurchased OpenAI API platform balance ($5+ credit top-up).",
    defaultModel: "gpt-5.6-omni",
    defaultBaseUrl: "https://api.openai.com/v1",
    placeholderKey: "sk-proj-…",
    desc: "OpenAI frontier models (GPT-5.6 Omni, GPT-5.0, GPT-5 Mini, o4 Reasoner, GPT-4.5 Preview, o3-mini, o1). Omnichannel reasoning and execution.",
    models: [
      { id: "gpt-5.6-omni", label: "GPT-5.6 Omni (Frontier Multimodal)", badge: "LATEST", badgeColor: "#10b981" },
      { id: "gpt-5-o", label: "GPT-5.0 (Flagship Intelligence)", badge: "LATEST", badgeColor: "#10b981" },
      { id: "gpt-5-mini", label: "GPT-5 Mini (High Speed Lightweight)", badge: "FAST", badgeColor: "#34d399" },
      { id: "o4-reasoner", label: "o4 Reasoner (Next-Gen STEM & Math)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "gpt-4.5-preview", label: "GPT-4.5 Preview (Research Flagship)", badge: "FLAGSHIP", badgeColor: "#3b82f6" },
      { id: "o3-mini", label: "o3-mini (High Speed Reasoning)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "o1", label: "o1 (Flagship Deep Reasoning)", badge: "REASONING", badgeColor: "#3b82f6" },
      { id: "gpt-4o", label: "GPT-4o (Multimodal Vision Flagship)", badge: "FLAGSHIP", badgeColor: "#38bdf8" },
      { id: "gpt-4o-mini", label: "GPT-4o-mini (Cost Efficient)", badge: "FAST", badgeColor: "#64748b" },
    ],
  },
  {
    id: "QWEN",
    dbProvider: "CUSTOM",
    label: "Alibaba Cloud (Qwen 3 / QwQ)",
    color: "#ff6a00",
    pricingCategory: "ULTRA_LOW_COST",
    pricingLabel: "Ultra Low Cost",
    pricingBadgeColor: "#ff6a00",
    pricingDetails: "Alibaba Cloud DashScope API with industry-leading multilingual, vision OCR, and QwQ deep reasoning.",
    defaultModel: "qwen-3-max",
    defaultBaseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    placeholderKey: "sk-…",
    desc: "Alibaba Qwen frontier models (Qwen 3 Max, QwQ 32B Reasoning, Qwen 2.5 Max, Qwen 2.5 Coder 32B, Qwen 2.5 VL Vision).",
    models: [
      { id: "qwen-3-max", label: "Qwen 3 Max (Frontier Flagship)", badge: "LATEST", badgeColor: "#ff6a00" },
      { id: "qwen-3-plus", label: "Qwen 3 Plus (Balanced Frontier)", badge: "FAST", badgeColor: "#10b981" },
      { id: "qwen-qwq-32b-preview", label: "QwQ 32B (Deep Reasoning)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "qwen-2.5-max", label: "Qwen 2.5 Max (Top Benchmark)", badge: "FLAGSHIP", badgeColor: "#f59e0b" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B (Formulas & Math)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "qwen-2.5-vl-72b-instruct", label: "Qwen 2.5 VL 72B (Document Vision OCR)", badge: "VISION", badgeColor: "#38bdf8" },
    ],
  },
  {
    id: "GLM",
    dbProvider: "CUSTOM",
    label: "Zhipu AI (GLM-4 / CodeGeeX)",
    color: "#3b82f6",
    pricingCategory: "FREE_TIER",
    pricingLabel: "Free Tier & Paid",
    pricingBadgeColor: "#10b981",
    pricingDetails: "Zhipu AI BigModel platform featuring GLM-4 Plus, GLM-4V Plus multimodal vision, and GLM-4 Flash free tier.",
    defaultModel: "glm-4-plus",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    placeholderKey: "…",
    desc: "Zhipu AI GLM models (GLM-4 Plus, GLM-4V Plus Vision, GLM-4 Flash free tier, CodeGeeX-4).",
    models: [
      { id: "glm-4-plus", label: "GLM-4 Plus (Flagship Intelligence)", badge: "LATEST", badgeColor: "#3b82f6" },
      { id: "glm-4v-plus", label: "GLM-4V Plus (Multimodal Vision OCR)", badge: "VISION", badgeColor: "#38bdf8" },
      { id: "glm-4-voice", label: "GLM-4 Voice (Omnimodal Real-Time)", badge: "LATEST", badgeColor: "#a855f7" },
      { id: "glm-4-air", label: "GLM-4 Air (High Speed)", badge: "FAST", badgeColor: "#10b981" },
      { id: "glm-4-flash", label: "GLM-4 Flash (100% Free Tier)", badge: "FREE", badgeColor: "#34d399" },
      { id: "codegeex-4", label: "CodeGeeX-4 (Code & Formulas)", badge: "FLAGSHIP", badgeColor: "#64748b" },
    ],
  },
  {
    id: "KIMI",
    dbProvider: "CUSTOM",
    label: "Moonshot AI (Kimi-K3 / K2)",
    color: "#ec4899",
    pricingCategory: "ULTRA_LOW_COST",
    pricingLabel: "Ultra Low Cost",
    pricingBadgeColor: "#ec4899",
    pricingDetails: "Moonshot AI platform offering million-token context parsing and fast financial reasoning.",
    defaultModel: "kimi-k3",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    placeholderKey: "sk-…",
    desc: "Moonshot AI Kimi models (Kimi-K3, Kimi-K2 Chat, Kimi-1.5 Max). Long-context PDF document intelligence.",
    models: [
      { id: "kimi-k3", label: "Kimi-K3 (Next-Gen Flagship)", badge: "LATEST", badgeColor: "#ec4899" },
      { id: "kimi-k2-chat", label: "Kimi-K2 Chat (Deep Long-Context)", badge: "FLAGSHIP", badgeColor: "#a855f7" },
      { id: "kimi-1.5-max", label: "Kimi-1.5 Max (2M Token Context)", badge: "FAST", badgeColor: "#3b82f6" },
      { id: "moonshot-v1-128k", label: "Moonshot v1 128k", badge: "FAST", badgeColor: "#64748b" },
    ],
  },
  {
    id: "DEEPSEEK",
    dbProvider: "CUSTOM",
    label: "DeepSeek AI (V4 / R2 / R1)",
    color: "#3b82f6",
    pricingCategory: "ULTRA_LOW_COST",
    pricingLabel: "Ultra Low Cost",
    pricingBadgeColor: "#38bdf8",
    pricingDetails: "DeepSeek charges ~$0.14 - $0.28 per 1M input tokens. Highly economical for deep reasoning.",
    defaultModel: "deepseek-v4",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    placeholderKey: "sk-…",
    desc: "DeepSeek official API (DeepSeek-V4 1T MoE, DeepSeek-R2, DeepSeek-R1 671B reasoning, DeepSeek-V3). Ultra cost-efficient.",
    models: [
      { id: "deepseek-v4", label: "DeepSeek-V4 (1T MoE Flagship)", badge: "LATEST", badgeColor: "#3b82f6" },
      { id: "deepseek-r2-reasoner", label: "DeepSeek-R2 (Next-Gen Reasoning)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "deepseek-reasoner", label: "DeepSeek-R1 (Full Reasoning 671B)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "deepseek-chat", label: "DeepSeek-V3 (General MoE 671B)", badge: "FLAGSHIP", badgeColor: "#38bdf8" },
      { id: "deepseek-r1-distill-qwen-32b", label: "DeepSeek-R1 Distill Qwen 32B", badge: "FAST", badgeColor: "#10b981" },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek-R1 Distill Llama 70B", badge: "FLAGSHIP", badgeColor: "#f59e0b" },
    ],
  },
  {
    id: "XAI",
    dbProvider: "CUSTOM",
    label: "xAI (Grok-3 / Grok-2)",
    color: "#e2e8f0",
    pricingCategory: "PAID_API",
    pricingLabel: "Paid ($25 Credit / Trial)",
    pricingBadgeColor: "#f59e0b",
    pricingDetails: "New accounts receive $25 trial credit on xAI console, then pay-as-you-go.",
    defaultModel: "grok-3-ultra",
    defaultBaseUrl: "https://api.x.ai/v1",
    placeholderKey: "xai-…",
    desc: "xAI platform API for Grok-3 Ultra, Grok-3, Grok-2 and Grok-2 Vision with real-time financial reasoning.",
    models: [
      { id: "grok-3-ultra", label: "Grok-3 Ultra (Colossus Cluster Flagship)", badge: "LATEST", badgeColor: "#e2e8f0" },
      { id: "grok-3", label: "Grok-3 (Real-Time Reasoning)", badge: "LATEST", badgeColor: "#38bdf8" },
      { id: "grok-2-1212", label: "Grok-2 (Text Flagship)", badge: "FLAGSHIP", badgeColor: "#94a3b8" },
      { id: "grok-2-vision-1212", label: "Grok-2 Vision (Document Understanding)", badge: "VISION", badgeColor: "#38bdf8" },
      { id: "grok-beta", label: "Grok Beta (Fast)", badge: "FAST", badgeColor: "#64748b" },
    ],
  },
  {
    id: "MISTRAL",
    dbProvider: "CUSTOM",
    label: "Mistral AI (Large 3 / Pixtral)",
    color: "#f97316",
    pricingCategory: "FREE_TIER",
    pricingLabel: "Free Tier & Paid",
    pricingBadgeColor: "#10b981",
    pricingDetails: "Mistral La Plateforme offers free trial credits and pay-as-you-go for commercial tiers.",
    defaultModel: "mistral-large-3",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    placeholderKey: "…",
    desc: "European AI frontier models (Mistral Large 3, Pixtral 3 Large 124B Vision, Codestral v2).",
    models: [
      { id: "mistral-large-3", label: "Mistral Large 3 (Frontier Flagship)", badge: "LATEST", badgeColor: "#f97316" },
      { id: "pixtral-3-large", label: "Pixtral 3 Large (Multimodal OCR & Vision)", badge: "VISION", badgeColor: "#38bdf8" },
      { id: "codestral-v2", label: "Codestral v2 (Financial Formulas & Code)", badge: "FLAGSHIP", badgeColor: "#a855f7" },
      { id: "mistral-large-latest", label: "Mistral Large 2", badge: "FLAGSHIP", badgeColor: "#f97316" },
      { id: "mistral-small-latest", label: "Mistral Small (Fast)", badge: "FAST", badgeColor: "#10b981" },
    ],
  },
  {
    id: "GROQ",
    dbProvider: "CUSTOM",
    label: "Groq Cloud (LPU Hardware)",
    color: "#f43f5e",
    pricingCategory: "FREE_TIER",
    pricingLabel: "Free Tier Available",
    pricingBadgeColor: "#10b981",
    pricingDetails: "Groq offers free developer rate limits with ultra low-latency LPU hardware execution.",
    defaultModel: "llama-4-70b-groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    placeholderKey: "gsk_…",
    desc: "Ultra low-latency LPU hardware running open-weights Llama 4 70B, Llama 3.3 70B, Qwen 2.5 Coder, and DeepSeek R1/R2.",
    models: [
      { id: "llama-4-70b-groq", label: "Meta Llama 4 70B (on Groq LPU)", badge: "LATEST", badgeColor: "#f43f5e" },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", badge: "FLAGSHIP", badgeColor: "#f43f5e" },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek-R1 Distill 70B (Fast Reasoning)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder 32B", badge: "FLAGSHIP", badgeColor: "#38bdf8" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (Ultra Fast)", badge: "FAST", badgeColor: "#10b981" },
    ],
  },
  {
    id: "OPENROUTER",
    dbProvider: "CUSTOM",
    label: "OpenRouter (Universal Router)",
    color: "#06b6d4",
    pricingCategory: "FREE_TIER",
    pricingLabel: "Free Models + Paid",
    pricingBadgeColor: "#10b981",
    pricingDetails: "Provides both free tier community models (suffix ':free') and pay-as-you-go commercial routing for 200+ models.",
    defaultModel: "anthropic/claude-opus-4-8",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    placeholderKey: "sk-or-v1-…",
    desc: "Single API key routing to hundreds of open-source and proprietary models.",
    models: [
      { id: "anthropic/claude-opus-4-8", label: "Claude Opus 4.8 (via OpenRouter)", badge: "LATEST", badgeColor: "#a855f7" },
      { id: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet (via OpenRouter)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "openai/gpt-5.6-omni", label: "GPT-5.6 Omni (via OpenRouter)", badge: "LATEST", badgeColor: "#10b981" },
      { id: "google/gemini-3.7-ultra", label: "Gemini 3.7 Ultra (via OpenRouter)", badge: "LATEST", badgeColor: "#f59e0b" },
      { id: "qwen/qwen-3-max", label: "Qwen 3 Max (via OpenRouter)", badge: "LATEST", badgeColor: "#ff6a00" },
      { id: "zhipu/glm-4-plus", label: "GLM-4 Plus (via OpenRouter)", badge: "LATEST", badgeColor: "#3b82f6" },
      { id: "deepseek/deepseek-v4", label: "DeepSeek V4 (via OpenRouter)", badge: "LATEST", badgeColor: "#38bdf8" },
      { id: "moonshot/kimi-k3", label: "Kimi K3 (via OpenRouter)", badge: "LATEST", badgeColor: "#ec4899" },
      { id: "meta-llama/llama-4-70b:free", label: "Llama 4 70B (Free Tier Community)", badge: "FREE", badgeColor: "#34d399" },
    ],
  },
  {
    id: "OLLAMA",
    dbProvider: "CUSTOM",
    label: "Ollama (Local / Private)",
    color: "#14b8a6",
    pricingCategory: "FREE_LOCAL",
    pricingLabel: "100% Free (Local HW)",
    pricingBadgeColor: "#34d399",
    pricingDetails: "Runs entirely on your computer hardware. Zero API bills, zero data egress, 100% offline privacy.",
    defaultModel: "llama4:latest",
    defaultBaseUrl: "http://localhost:11434/v1",
    placeholderKey: "ollama-local-key",
    desc: "Zero-cloud private local LLM running on your local machine via Ollama.",
    models: [
      { id: "llama4:latest", label: "Meta Llama 4 (Latest 70B / 8B)", badge: "LATEST", badgeColor: "#14b8a6" },
      { id: "deepseek-r2:latest", label: "DeepSeek-R2 (Local Reasoning)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "qwen3:latest", label: "Qwen 3 (Latest Alibaba)", badge: "FLAGSHIP", badgeColor: "#ff6a00" },
      { id: "glm4:latest", label: "GLM-4 (Local)", badge: "FLAGSHIP", badgeColor: "#3b82f6" },
      { id: "kimi-k3:local", label: "Kimi-K3 (Local Quantized)", badge: "LATEST", badgeColor: "#ec4899" },
      { id: "llama3.3:latest", label: "Llama 3.3 70B", badge: "FLAGSHIP", badgeColor: "#64748b" },
      { id: "phi4:latest", label: "Microsoft Phi-4", badge: "FAST", badgeColor: "#10b981" },
    ],
  },
  {
    id: "LM_STUDIO",
    dbProvider: "CUSTOM",
    label: "LM Studio (Local Desktop)",
    color: "#8b5cf6",
    pricingCategory: "FREE_LOCAL",
    pricingLabel: "100% Free (Local HW)",
    pricingBadgeColor: "#34d399",
    pricingDetails: "Desktop GUI local model runner. Zero API cost, uses your local GPU/CPU.",
    defaultModel: "local-model",
    defaultBaseUrl: "http://localhost:1234/v1",
    placeholderKey: "lm-studio-key",
    desc: "Local inference server running on your desktop via LM Studio.",
    models: [
      { id: "local-model", label: "Active Loaded Model (LM Studio)", badge: "LATEST", badgeColor: "#8b5cf6" },
    ],
  },
  {
    id: "AZURE_OPENAI",
    dbProvider: "AZURE_OPENAI",
    label: "Azure OpenAI (Enterprise)",
    color: "#0284c7",
    pricingCategory: "PAID_API",
    pricingLabel: "Enterprise Paid",
    pricingBadgeColor: "#64748b",
    pricingDetails: "Billed directly through your enterprise Microsoft Azure subscription.",
    defaultModel: "gpt-5.6-omni",
    defaultBaseUrl: "https://your-resource.openai.azure.com/openai/deployments/gpt-5-6",
    placeholderKey: "azure-key-…",
    desc: "Private Microsoft Azure deployment endpoint with enterprise tenancy compliance.",
    models: [
      { id: "gpt-5.6-omni", label: "GPT-5.6 Omni (Azure Enterprise)", badge: "LATEST", badgeColor: "#0284c7" },
      { id: "gpt-4o", label: "GPT-4o (Azure Enterprise)", badge: "FLAGSHIP", badgeColor: "#0284c7" },
      { id: "o4-reasoner", label: "o4 Reasoner (Azure Enterprise)", badge: "REASONING", badgeColor: "#a855f7" },
      { id: "gpt-4o-mini", label: "GPT-4o-mini (Azure Fast)", badge: "FAST", badgeColor: "#10b981" },
    ],
  },
  {
    id: "CUSTOM",
    dbProvider: "CUSTOM",
    label: "Custom Endpoint",
    color: "#64748b",
    pricingCategory: "FREE_LOCAL",
    pricingLabel: "Self-Hosted / Varies",
    pricingBadgeColor: "#64748b",
    pricingDetails: "Dependent on your hosting infrastructure (vLLM, LiteLLM, Cloudflare AI, local server).",
    defaultModel: "custom-model",
    defaultBaseUrl: "https://api.your-server.com/v1",
    placeholderKey: "sk-…",
    desc: "Any custom OpenAI-compatible server (vLLM, TGI, LiteLLM, Cloudflare AI).",
    models: [
      { id: "custom-model", label: "Custom Model ID", badge: "LATEST", badgeColor: "#64748b" },
    ],
  },
];

const PROVIDER_METADATA: Record<string, { label: string; color: string }> = {
  ANTHROPIC: { label: "Anthropic (Opus 4.8 / Claude 3.7)", color: "#a855f7" },
  OPENAI: { label: "OpenAI (GPT-5.6 / o3 / o1)", color: "#10b981" },
  GOOGLE: { label: "Google (Gemini 3.7 / 2.5)", color: "#f59e0b" },
  AZURE_OPENAI: { label: "Azure OpenAI", color: "#0284c7" },
  CUSTOM: { label: "Custom / Multi-Provider", color: "#38bdf8" },
};

const AGENT_LABELS: Record<string, { label: string; desc: string; iconColor: string }> = {
  DOCUMENT_AGENT: {
    label: "DOCUMENT_AGENT",
    desc: "Scans statement & payslip PDFs with Multi-Agent OCR and extracts line items. (Vision model recommended)",
    iconColor: "#3b82f6",
  },
  BUDGET_AGENT: {
    label: "BUDGET_AGENT",
    desc: "Arbitrates surplus cashflow allocations between debt payoff waterfalls and fixed household expenses.",
    iconColor: "#10b981",
  },
  DEBT_AGENT: {
    label: "DEBT_AGENT",
    desc: "Computes snowball & avalanche payoff timelines, shift narrations, and interest cost savings.",
    iconColor: "#f59e0b",
  },
  GOALS_AGENT: {
    label: "GOALS_AGENT",
    desc: "Tracks emergency reserves, house deposit targets, and retirement / high-yield wealth accumulation.",
    iconColor: "#a855f7",
  },
};

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [assignments, setAssignments] = useState<AgentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Selected Preset in Modal
  const [selectedPresetId, setSelectedPresetId] = useState<string>("GOOGLE");
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Property data services state
  const [propCfg, setPropCfg] = useState<{
    windeedUsername: string;
    windeedPasswordMasked: string;
    windeedStatus: string;
    lightstoneKeyMasked: string;
    lightstoneStatus: string;
  } | null>(null);
  const [windeedForm, setWindeedForm] = useState({ username: "", password: "", showPw: false });
  const [lightstoneForm, setLightstoneForm] = useState({ apiKey: "", showKey: false });
  const [propSaving, setPropSaving] = useState<string | null>(null);
  const [propMsg, setPropMsg] = useState<{ provider: string; ok: boolean; text: string } | null>(null);

  const [form, setForm] = useState({
    provider: "GOOGLE",
    displayName: "",
    apiKey: "",
    baseUrl: "",
    modelName: "gemini-3.7-flash",
  });

  // Edit LLM Modal State
  const [editingConfig, setEditingConfig] = useState<ProviderConfig | null>(null);
  const [editForm, setEditForm] = useState({
    id: "",
    provider: "GOOGLE",
    displayName: "",
    apiKey: "",
    baseUrl: "",
    modelName: "",
    status: "ACTIVE",
  });
  const [isEditCustomModelInput, setIsEditCustomModelInput] = useState(false);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [editSelectedPresetId, setEditSelectedPresetId] = useState<string>("GOOGLE");

  const handleOpenEditModal = (config: ProviderConfig) => {
    setEditingConfig(config);
    const matchedPreset =
      LLM_PRESETS.find((p) => p.models.some((m) => m.id === config.modelName)) ||
      LLM_PRESETS.find((p) => p.dbProvider === config.provider) ||
      LLM_PRESETS[0];

    setEditSelectedPresetId(matchedPreset.id);
    const hasPresetModel = matchedPreset.models.some((m) => m.id === config.modelName);
    setIsEditCustomModelInput(!hasPresetModel);
    setEditModalError(null);

    setEditForm({
      id: config.id,
      provider: config.provider,
      displayName: config.displayName,
      apiKey: "", // Leave blank to keep existing encrypted key
      baseUrl: config.baseUrl || "",
      modelName: config.modelName,
      status: config.status,
    });
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingKey(true);
    setEditModalError(null);

    try {
      const payload: any = {
        id: editForm.id,
        provider: editForm.provider,
        displayName: editForm.displayName,
        modelName: editForm.modelName,
        baseUrl: editForm.baseUrl ? editForm.baseUrl.trim() : null,
        status: editForm.status,
      };

      if (editForm.apiKey && editForm.apiKey.trim().length > 0) {
        payload.apiKey = editForm.apiKey.trim();
      }

      const res = await fetch("/api/settings/llm-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditModalError(data.message || data.error || `Failed to update key (HTTP ${res.status})`);
        return;
      }

      setEditingConfig(null);
      setTestFeedback({
        id: data.id || "updated-key",
        ok: data.status === "ACTIVE" || data?.validation?.valid === true,
        message: `LLM Provider Key "${data.displayName || editForm.displayName}" updated successfully!`,
      });
      await loadSettings();
    } catch (err: any) {
      setEditModalError(err.message || "Network error while updating key.");
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const loadSettings = async () => {
    try {
      // 1. Check Auth Status
      const authRes = await fetch("/api/auth/me").then((r) => r.json());
      const authed = authRes.authenticated === true;
      setIsAuthenticated(authed);

      if (authed) {
        const [cRes, aRes, pRes] = await Promise.all([
          fetch("/api/settings/llm-providers").then((r) => r.json()),
          fetch("/api/settings/agent-models").then((r) => r.json()),
          fetch("/api/settings/property-data").then((r) => r.json()),
        ]);
        setConfigs(Array.isArray(cRes) ? cRes : []);
        setAssignments(Array.isArray(aRes) ? aRes : []);
        if (pRes && !pRes.error) setPropCfg(pRes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const [testFeedback, setTestFeedback] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsCustomModelInput(false);
    setModalError(null);
    const preset = LLM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setForm({
        provider: preset.dbProvider,
        displayName: `${preset.label.split(" (")[0]} (${preset.defaultModel})`,
        apiKey: preset.placeholderKey.includes("local") ? preset.placeholderKey : "",
        baseUrl: preset.defaultBaseUrl,
        modelName: preset.defaultModel,
      });
    }
  };

  const handleTestKey = async (id: string, displayName: string) => {
    setTestingId(id);
    setTestFeedback(null);
    try {
      const res = await fetch("/api/settings/llm-providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      const isValid = data?.validation?.valid === true || data?.status === "ACTIVE";

      setTestFeedback({
        id,
        ok: isValid,
        message: isValid
          ? `Key "${displayName}" validated successfully! Status is ACTIVE.`
          : `Key "${displayName}" validation returned: ${data?.validation?.message || data?.status || "Invalid Key"}.`,
      });
    } catch (err: any) {
      setTestFeedback({
        id,
        ok: false,
        message: `Network error testing key "${displayName}": ${err?.message}`,
      });
    } finally {
      setTestingId(null);
      loadSettings();
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete LLM Key "${name}"?`)) return;
    await fetch(`/api/settings/llm-providers?id=${id}`, { method: "DELETE" });
    loadSettings();
  };

  const handleAddConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKey(true);
    setModalError(null);

    try {
      const res = await fetch("/api/settings/llm-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setModalError(data.message || data.error || `Failed to save key (HTTP ${res.status})`);
        return;
      }

      setShowAddModal(false);
      setTestFeedback({
        id: data.id || "new-key",
        ok: data.status === "ACTIVE" || data?.validation?.valid === true,
        message: `LLM Provider Key "${data.displayName || form.displayName}" saved successfully!`,
      });
      await loadSettings();
    } catch (err: any) {
      setModalError(err.message || "Network error while saving key.");
    } finally {
      setIsSavingKey(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSyncEnvKeys = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/settings/llm-providers/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg({ ok: true, text: data.message || "Environment LLM keys synced to vault!" });
        loadSettings();
      } else {
        setSyncMsg({ ok: false, text: data.error || "Failed to sync environment keys." });
      }
    } catch (e: any) {
      setSyncMsg({ ok: false, text: e.message || "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const handleAssignModel = async (agent: string, llmProviderConfigId: string) => {
    await fetch("/api/settings/agent-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, llmProviderConfigId }),
    });
    loadSettings();
  };

  const handleSavePropertyProvider = async (provider: "WINDEED" | "LIGHTSTONE") => {
    setPropSaving(provider);
    setPropMsg(null);
    const body =
      provider === "WINDEED"
        ? { provider, username: windeedForm.username, password: windeedForm.password }
        : { provider, apiKey: lightstoneForm.apiKey };
    const res = await fetch("/api/settings/property-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const ok = data.status === "ACTIVE" || data.status === "UNVERIFIED";
    setPropMsg({ provider, ok, text: ok ? `Connected (${data.status})` : `Failed: ${data.status}` });
    setPropSaving(null);
    loadSettings();
  };

  const handleDisconnectPropertyProvider = async (provider: "WINDEED" | "LIGHTSTONE") => {
    await fetch(`/api/settings/property-data?provider=${provider}`, { method: "DELETE" });
    loadSettings();
  };

  if (loading) {
    return (
      <div className="page-body" style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: "14px", color: "#94a3b8", fontFamily: "var(--font-mono, monospace)" }} className="animate-pulse">
          Loading BYOK credentials &amp; multi-agent assignments…
        </div>
      </div>
    );
  }

  const currentPreset = LLM_PRESETS.find((p) => p.id === selectedPresetId) || LLM_PRESETS[0];

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Settings &amp; Multi-LLM Vault
            <span className="badge badge-gold text-xs font-mono">v4.0 Obsidian</span>
          </h1>
          <p className="page-subtitle">
            Configure Gemini 3.7, Claude Opus 4.8/4.6, GPT-5.6, Qwen 3, GLM-4, Kimi-K3, DeepSeek V4, and Grok-3 via clean dropdown selectors.
          </p>
        </div>

        {isAuthenticated && (
          <div className="flex gap-3 items-center flex-wrap">
            <button
              onClick={handleSyncEnvKeys}
              disabled={syncing}
              className="btn btn-secondary"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              <span>{syncing ? "Syncing .env..." : "Sync .env Keys"}</span>
            </button>

            <button
              onClick={() => {
                handleSelectPreset("GOOGLE");
                setModalError(null);
                setShowAddModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>+ Add LLM Provider Key</span>
            </button>
          </div>
        )}
      </div>

      <div className="page-body">

      {syncMsg && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: syncMsg.ok ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${syncMsg.ok ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: syncMsg.ok ? "#34d399" : "#f87171",
          }}
        >
          {syncMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {syncMsg.text}
        </div>
      )}

      {!isAuthenticated ? (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "20px",
            padding: "48px 32px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "40px auto",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ color: "#fbbf24", marginBottom: "16px" }}>
            <Lock size={44} style={{ margin: "0 auto" }} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#f8fafc", marginBottom: "8px" }}>
            Authentication Required
          </h2>
          <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px", lineHeight: 1.6 }}>
            API keys and agent routing are secured per user session. Please sign in to access your private LLM vault.
          </p>
          <a
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            <LogIn size={16} /> Sign In
          </a>
        </div>
      ) : (
        <>
          {/* Top Pricing Tier Legend Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
              marginBottom: "24px",
            }}
          >
            <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Gift size={18} style={{ color: "#34d399" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#34d399" }}>Free Tier Available</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Google Gemini, GLM-4 Flash (100% Free), Groq Cloud, OpenRouter free</div>
              </div>
            </div>

            <div style={{ background: "rgba(20, 184, 166, 0.08)", border: "1px solid rgba(20, 184, 166, 0.25)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <HardDrive size={18} style={{ color: "#2dd4bf" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#2dd4bf" }}>100% Free (Local PC)</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Ollama &amp; LM Studio running locally on your machine</div>
              </div>
            </div>

            <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <BrainCircuit size={18} style={{ color: "#38bdf8" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#38bdf8" }}>Ultra Low Cost</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Qwen 3, GLM-4, DeepSeek V4/R2, Kimi K3 (~$0.14 - $0.28 / 1M)</div>
              </div>
            </div>

            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "10px" }}>
              <DollarSign size={18} style={{ color: "#fbbf24" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: "800", color: "#fbbf24" }}>Paid API Credits</div>
                <div style={{ fontSize: "11px", color: "#94a3b8" }}>Anthropic Opus 4.8 / Claude 3.7, OpenAI GPT-5.6, xAI Grok-3</div>
              </div>
            </div>
          </div>

          {/* Test Key Feedback Banner */}
          {testFeedback && (
            <div
              style={{
                padding: "14px 20px",
                borderRadius: "12px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: testFeedback.ok ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                border: `1px solid ${testFeedback.ok ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"}`,
                color: testFeedback.ok ? "#34d399" : "#f87171",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {testFeedback.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {testFeedback.message}
            </div>
          )}

          {/* Section 1: Configured Provider Keys */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px",
              backdropFilter: "blur(20px)",
              marginBottom: "32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={20} style={{ color: "#34d399" }} />
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  Active BYOK LLM Keys ({configs.length})
                </h2>
              </div>
              <span style={{ fontSize: "12px", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                AES-256 Encrypted
              </span>
            </div>

            {configs.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                No LLM keys added yet. Click <strong>+ Add LLM Provider Key</strong> above to add your Gemini 3.7, Claude Opus 4.8, GPT-5.6, Qwen 3, GLM-4, or Kimi credentials.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Provider / Label</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Model Name &amp; Version</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Cost / Pricing</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Masked Key</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>Status</th>
                      <th style={{ padding: "10px 14px", color: "#64748b", fontSize: "11px", fontWeight: "700", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configs.map((c) => {
                      const meta = PROVIDER_METADATA[c.provider] || { label: c.provider, color: "#94a3b8" };
                      const isTesting = testingId === c.id;
                      const matchedPreset = LLM_PRESETS.find((p) => p.models.some((m) => m.id === c.modelName) || p.dbProvider === c.provider);

                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                          <td style={{ padding: "14px" }}>
                            <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: "14px" }}>{c.displayName}</div>
                            <div style={{ fontSize: "11px", color: meta.color, fontWeight: "700" }}>{meta.label}</div>
                          </td>
                          <td style={{ padding: "14px", fontFamily: "var(--font-mono)", fontSize: "13px", color: "#cbd5e1" }}>
                            <span style={{ fontWeight: "700", color: "#f8fafc" }}>{c.modelName}</span>
                          </td>
                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                padding: "3px 8px",
                                borderRadius: "8px",
                                background: matchedPreset?.pricingCategory === "FREE_TIER" || matchedPreset?.pricingCategory === "FREE_LOCAL" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                color: matchedPreset?.pricingBadgeColor || "#fbbf24",
                                border: `1px solid ${matchedPreset?.pricingBadgeColor || "#fbbf24"}40`,
                              }}
                            >
                              {matchedPreset?.pricingLabel || "BYOK Tier"}
                            </span>
                          </td>
                          <td style={{ padding: "14px", fontFamily: "var(--font-mono)", fontSize: "12px", color: "#94a3b8" }}>
                            {c.apiKeyMasked}
                          </td>
                          <td style={{ padding: "14px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                background: c.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                                color: c.status === "ACTIVE" ? "#34d399" : "#f87171",
                              }}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td style={{ padding: "14px", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                              <button
                                onClick={() => handleOpenEditModal(c)}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(59, 130, 246, 0.35)",
                                  background: "rgba(59, 130, 246, 0.12)",
                                  color: "#60a5fa",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  transition: "all 0.15s",
                                }}
                                title="Edit API Key, Model & Settings"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button
                                onClick={() => handleTestKey(c.id, c.displayName)}
                                disabled={isTesting}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  background: "rgba(255, 255, 255, 0.05)",
                                  color: "#cbd5e1",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <RefreshCw size={12} className={isTesting ? "animate-spin" : ""} />
                                {isTesting ? "Testing…" : "Test Key"}
                              </button>
                              <button
                                onClick={() => handleDeleteKey(c.id, c.displayName)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: "#f87171",
                                  fontSize: "12px",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Agent Model Assignments */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "20px",
              padding: "24px",
              backdropFilter: "blur(20px)",
              marginBottom: "32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "12px" }}>
              <Cpu size={20} style={{ color: "#60a5fa" }} />
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  Multi-Agent Model Routing &amp; Assignments
                </h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                  Route each specialized AI agent to your preferred LLM provider model version.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}>
              {(["DOCUMENT_AGENT", "BUDGET_AGENT", "DEBT_AGENT", "GOALS_AGENT"] as const).map((agentKey) => {
                const meta = AGENT_LABELS[agentKey];
                const currentAssigned = assignments.find((a) => a.agent === agentKey);

                return (
                  <div
                    key={agentKey}
                    style={{
                      background: "rgba(7, 11, 20, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "20px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "260px" }}>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: meta.iconColor, marginBottom: "2px" }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>{meta.desc}</div>
                    </div>

                    <div style={{ width: "340px" }}>
                      <select
                        value={currentAssigned?.configId || ""}
                        onChange={(e) => handleAssignModel(agentKey, e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "10px",
                          background: "rgba(15, 23, 42, 0.9)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#f8fafc",
                          fontSize: "13px",
                          fontWeight: "600",
                          outline: "none",
                        }}
                      >
                        <option value="">Select LLM Provider model…</option>
                        {configs.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.displayName} ({c.modelName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Add AI Provider Modal with All Providers & Models Dropdown */}
      {showAddModal && isAuthenticated && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => {
            if (!isSavingKey) setShowAddModal(false);
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "22px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sparkles size={20} style={{ color: "#fbbf24" }} />
                <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                  Configure BYOK LLM Provider Key &amp; Models
                </h2>
              </div>
              <button
                onClick={() => {
                  if (!isSavingKey) setShowAddModal(false);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Error Banner inside Modal if submission failed */}
            {modalError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  marginBottom: "16px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontWeight: "600",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Step 1: Provider Selection Grid with Pricing Badges */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "10px" }}>
                1. Select LLM Provider
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "10px" }}>
                {LLM_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isFree = preset.pricingCategory === "FREE_TIER" || preset.pricingCategory === "FREE_LOCAL";

                  return (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset.id)}
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border: isSelected ? `2px solid ${preset.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                        background: isSelected ? "rgba(255, 255, 255, 0.08)" : "rgba(7, 11, 20, 0.6)",
                        color: isSelected ? preset.color : "#cbd5e1",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        transition: "all 0.15s",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ fontWeight: "800", color: isSelected ? preset.color : "#f8fafc" }}>{preset.label}</span>
                      </div>
                      
                      {/* Pricing Tag */}
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "2px 6px",
                          borderRadius: "6px",
                          background: isFree ? "rgba(16, 185, 129, 0.18)" : "rgba(245, 158, 11, 0.18)",
                          color: preset.pricingBadgeColor,
                          border: `1px solid ${preset.pricingBadgeColor}40`,
                          display: "inline-block",
                          width: "fit-content",
                        }}
                      >
                        {preset.pricingLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleAddConfig} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Pricing & Provider details callout */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: currentPreset.pricingCategory === "FREE_TIER" || currentPreset.pricingCategory === "FREE_LOCAL" ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                  border: `1px solid ${currentPreset.pricingBadgeColor}40`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "800", color: currentPreset.pricingBadgeColor }}>
                  {currentPreset.pricingCategory === "FREE_LOCAL" ? <HardDrive size={15} /> : currentPreset.pricingCategory === "FREE_TIER" ? <Gift size={15} /> : <DollarSign size={15} />}
                  <span>{currentPreset.pricingLabel}</span> — {currentPreset.pricingDetails}
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                  {currentPreset.desc}
                </div>
              </div>

              {/* Step 2: Model Selection Dropdown with Full Version List */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1" }}>
                    2. Select Model from Dropdown List
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomModelInput(!isCustomModelInput)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#60a5fa",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {isCustomModelInput ? "Use preset dropdown" : "Type custom model ID"}
                  </button>
                </div>

                {!isCustomModelInput ? (
                  <select
                    value={form.modelName}
                    onChange={(e) => {
                      if (e.target.value === "__CUSTOM__") {
                        setIsCustomModelInput(true);
                      } else {
                        setForm({ ...form, modelName: e.target.value });
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(7, 11, 20, 0.8)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      fontWeight: "700",
                      outline: "none",
                      marginBottom: "10px",
                      cursor: "pointer",
                    }}
                  >
                    {currentPreset.models.map((m) => (
                      <option key={m.id} value={m.id} style={{ background: "#0f172a", color: "#f8fafc" }}>
                        {m.label} {m.badge ? `[${m.badge}]` : ""}
                      </option>
                    ))}
                    <option value="__CUSTOM__" style={{ background: "#0f172a", color: "#94a3b8" }}>
                      ✍️ Type custom / unlisted model name…
                    </option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. gemini-3.7-ultra, claude-opus-4-8, gpt-5.6-omni, qwen-3-max, glm-4-plus, kimi-k3"
                    value={form.modelName}
                    onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(7, 11, 20, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      fontFamily: "var(--font-mono)",
                      outline: "none",
                      marginBottom: "10px",
                    }}
                    required
                  />
                )}

                {/* 1-Click Quick Chips below dropdown */}
                {currentPreset.models.length > 0 && (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>Popular:</span>
                    {currentPreset.models.slice(0, 5).map((m) => {
                      const isSelected = form.modelName === m.id;
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => {
                            setIsCustomModelInput(false);
                            setForm({ ...form, modelName: m.id });
                          }}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "8px",
                            background: isSelected ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.04)",
                            border: isSelected ? "1px solid rgba(245, 158, 11, 0.6)" : "1px solid rgba(255, 255, 255, 0.08)",
                            color: isSelected ? "#fbbf24" : "#cbd5e1",
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.15s",
                          }}
                        >
                          <span>{m.id}</span>
                          {m.badge && (
                            <span
                              style={{
                                fontSize: "8px",
                                fontWeight: "800",
                                padding: "1px 4px",
                                borderRadius: "3px",
                                background: `${m.badgeColor || "#f59e0b"}25`,
                                color: m.badgeColor || "#f59e0b",
                              }}
                            >
                              {m.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Key Label */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Key Label / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Gemini 3.7 Key or GLM-4 Plus"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#f8fafc",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* API Key */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  API Key
                </label>
                <input
                  type="password"
                  placeholder={currentPreset.placeholderKey}
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#fbbf24",
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                  required
                />
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  AES-256 encrypted at rest. Never exposed or logged.
                </div>
              </div>

              {/* Base URL (if custom / proxy / azure / local) */}
              {(form.provider === "CUSTOM" || form.provider === "AZURE_OPENAI" || currentPreset.defaultBaseUrl) && (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                    Base URL / API Endpoint
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.your-endpoint.com/v1"
                    value={form.baseUrl}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      background: "rgba(7, 11, 20, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      color: "#94a3b8",
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
                <button
                  type="button"
                  disabled={isSavingKey}
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: isSavingKey ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKey}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: isSavingKey ? "#94a3b8" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    border: "none",
                    color: "#0f172a",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: isSavingKey ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isSavingKey && <Loader2 size={15} className="animate-spin" />}
                  {isSavingKey ? "Saving & Validating…" : "Save LLM Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Provider Modal */}
      {editingConfig && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0d1527 0%, #070b14 100%)",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              borderRadius: "24px",
              padding: "32px",
              width: "100%",
              maxWidth: "680px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(59, 130, 246, 0.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#60a5fa",
                  }}
                >
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#f8fafc", margin: 0 }}>
                    Edit LLM Provider Key &amp; Settings
                  </h3>
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, marginTop: "2px" }}>
                    Update API keys, model versions, base URLs, or activation status.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingConfig(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {editModalError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={16} />
                {editModalError}
              </div>
            )}

            <form onSubmit={handleUpdateConfig} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Provider Info Banner */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#60a5fa", textTransform: "uppercase" }}>
                    Provider Engine
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "800", color: "#f8fafc" }}>
                    {editingConfig.provider}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: editForm.status === "ACTIVE" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: editForm.status === "ACTIVE" ? "#34d399" : "#f87171",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      fontSize: "12px",
                      fontWeight: "800",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="ACTIVE" style={{ background: "#0f172a", color: "#34d399" }}>ACTIVE</option>
                    <option value="DISABLED" style={{ background: "#0f172a", color: "#f87171" }}>DISABLED</option>
                  </select>
                </div>
              </div>

              {/* Key Label / Description */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Key Label / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Google Gemini 3.7 Flash or Claude 3.7 Sonnet"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#f8fafc",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* Model Selection Dropdown */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1" }}>
                    Model ID / Version
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditCustomModelInput(!isEditCustomModelInput)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#60a5fa",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {isEditCustomModelInput ? "Choose from presets list" : "Type custom model ID"}
                  </button>
                </div>

                {!isEditCustomModelInput ? (
                  <select
                    value={editForm.modelName}
                    onChange={(e) => {
                      if (e.target.value === "__CUSTOM__") {
                        setIsEditCustomModelInput(true);
                      } else {
                        setEditForm({ ...editForm, modelName: e.target.value });
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(7, 11, 20, 0.8)",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      fontWeight: "700",
                      outline: "none",
                      marginBottom: "10px",
                      cursor: "pointer",
                    }}
                  >
                    {(LLM_PRESETS.find((p) => p.id === editSelectedPresetId)?.models || []).map((m) => (
                      <option key={m.id} value={m.id} style={{ background: "#0f172a", color: "#f8fafc" }}>
                        {m.label} {m.badge ? `[${m.badge}]` : ""}
                      </option>
                    ))}
                    <option value="__CUSTOM__" style={{ background: "#0f172a", color: "#94a3b8" }}>
                      ✍️ Type custom / unlisted model name…
                    </option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. gemini-3.7-flash, claude-3-7-sonnet-20250219, gpt-4o, deepseek-chat"
                    value={editForm.modelName}
                    onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "rgba(7, 11, 20, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "14px",
                      fontFamily: "var(--font-mono)",
                      outline: "none",
                      marginBottom: "10px",
                    }}
                    required
                  />
                )}
              </div>

              {/* API Key */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  API Key (Encrypted Vault)
                </label>
                <input
                  type="password"
                  placeholder="•••••••••••••••• (Leave blank to keep existing key)"
                  value={editForm.apiKey}
                  onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#fbbf24",
                    fontSize: "14px",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                />
                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                  <span>Current masked key: <strong style={{ color: "#e2e8f0" }}>{editingConfig.apiKeyMasked}</strong></span>
                  <span style={{ color: "#64748b" }}>Leave blank to retain current key</span>
                </div>
              </div>

              {/* Base URL (for custom/proxies/azure/ollama) */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#cbd5e1", display: "block", marginBottom: "6px" }}>
                  Base URL / API Endpoint (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://api.deepseek.com/v1 or http://localhost:11434/v1"
                  value={editForm.baseUrl}
                  onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(7, 11, 20, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    color: "#94a3b8",
                    fontSize: "13px",
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "16px" }}>
                <button
                  type="button"
                  disabled={isUpdatingKey}
                  onClick={() => setEditingConfig(null)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: isUpdatingKey ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingKey}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "10px",
                    background: isUpdatingKey ? "#94a3b8" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: isUpdatingKey ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isUpdatingKey && <Loader2 size={15} className="animate-spin" />}
                  {isUpdatingKey ? "Saving & Validating…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
