import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { decryptApiKey, resolveGoogleModel, resolveAgentLLMConfig } from "@/agents/llmProvider";
import { searchDocumentEmbeddings } from "@/lib/embeddings";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ─── Context builder ─────────────────────────────────────────────────────────

async function buildFinancialContext(userId: string, userQuestion: string): Promise<string> {
  const [profile, incomes, debts, goals, accounts, assets, budgetItems, snapshots, docChunks] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.income.findMany({ where: { userId } }),
    prisma.debt.findMany({
      where: { account: { userId } },
      include: { account: { select: { name: true, institution: true, type: true } } },
      orderBy: [{ urgencyFlag: "desc" }, { currentBalance: "desc" }],
    }),
    prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { priority: "asc" } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.asset.findMany({ where: { userId } }),
    prisma.budgetLineItem.findMany({
      where: { userId, month: new Date().toISOString().slice(0, 7) },
    }),
    prisma.netWorthSnapshot.findMany({ orderBy: { snapshotDate: "desc" }, take: 3 }),
    searchDocumentEmbeddings(userQuestion, 4, userId).catch(() => []),
  ]);

  const totalDebt = debts.reduce((s, d) => s + Number(d.currentBalance), 0);
  const totalAssets = assets.reduce((s, a) => s + Number(a.currentValue), 0);
  const totalBankAssets = accounts.filter((a) => !a.isDebt).reduce((s, a) => s + Number(a.openingBalance), 0);
  const netWorth = totalAssets + totalBankAssets - totalDebt;
  const totalIncome = incomes.reduce((s, i) => s + Number(i.recurringAmount), 0);

  const recurringExpenses = budgetItems
    .filter((i) => i.category !== "ONE_OFF_UNEXPECTED")
    .reduce((s, i) => s + Number(i.amount), 0);
  const netMargin = totalIncome - recurringExpenses;

  const urgentDebts = debts.filter((d) => d.urgencyFlag !== "NONE");

  let ctx = `Today: ${new Date().toISOString().slice(0, 10)}\n`;
  ctx += `User: ${profile?.fullName ?? "Unknown"} | ${profile?.jobTitle ?? ""} @ ${profile?.employerName ?? ""}\n\n`;

  ctx += `=== INCOME ===\n`;
  incomes.forEach((i) => {
    ctx += `• ${i.sourceName}: R${Number(i.recurringAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })} /month (${i.recurringAmountConfidence})\n`;
  });

  ctx += `\n=== NET WORTH SNAPSHOT ===\n`;
  ctx += `Total Assets: R${(totalAssets + totalBankAssets).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;
  ctx += `Total Debts: R${totalDebt.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;
  ctx += `Net Worth: R${netWorth.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;

  ctx += `\n=== DEBTS (${debts.length}) ===\n`;
  debts.forEach((d, i) => {
    const rate = d.annualInterestRate ? ` @ ${(Number(d.annualInterestRate) * 100).toFixed(2)}% p.a.` : "";
    const urgency = d.urgencyFlag !== "NONE" ? ` ⚠️ ${d.urgencyFlag}` : "";
    ctx += `${i + 1}. ${d.account.name} (${d.account.institution}) — R${Number(d.currentBalance).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}${rate} | min R${Number(d.minimumPayment).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}/mo | ${d.status}${urgency}\n`;
    if (d.urgencyNote) ctx += `   Note: ${d.urgencyNote}\n`;
  });

  if (urgentDebts.length > 0) {
    ctx += `\n⚠️ URGENT DEBTS: ${urgentDebts.map((d) => d.account.name).join(", ")}\n`;
  }

  ctx += `\n=== GOALS (${goals.length} active) ===\n`;
  goals.forEach((g) => {
    const pct = g.targetAmount && Number(g.targetAmount) > 0
      ? ` (${Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100))}%)`
      : "";
    const proj = g.projectedCompletionDate
      ? ` → ${new Date(g.projectedCompletionDate).toISOString().slice(0, 7)}`
      : "";
    ctx += `• ${g.name}: R${Number(g.currentAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}${g.targetAmount ? ` / R${Number(g.targetAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` : ""}${pct}${proj} — R${Number(g.monthlyContribution).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}/mo\n`;
  });

  ctx += `\n=== THIS MONTH'S BUDGET ===\n`;
  ctx += `Recurring income: R${totalIncome.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;
  ctx += `Recurring expenses: R${recurringExpenses.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;
  ctx += `Net margin: R${netMargin.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;

  const byCategory: Record<string, number> = {};
  budgetItems.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] ?? 0) + Number(i.amount);
  });
  Object.entries(byCategory).forEach(([cat, total]) => {
    ctx += `  ${cat}: R${total.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}\n`;
  });

  if (assets.length > 0) {
    ctx += `\n=== ASSETS ===\n`;
    assets.forEach((a) => {
      ctx += `• ${a.name}: R${Number(a.currentValue).toLocaleString("en-ZA", { minimumFractionDigits: 2 })} (${a.valueConfidence})\n`;
    });
  }

  if (docChunks.length > 0) {
    ctx += `\n=== RELEVANT DOCUMENT EXCERPTS ===\n`;
    docChunks.forEach((chunk) => {
      ctx += `[${chunk.document.documentType}] ${chunk.contentChunk.slice(0, 300)}\n`;
    });
  }

  return ctx;
}

// ─── LLM call dispatch ────────────────────────────────────────────────────────

async function callLLM(
  provider: string,
  modelName: string,
  apiKey: string,
  baseUrl: string | null,
  messages: ChatMessage[]
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (provider === "ANTHROPIC") {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const turns = messages.filter((m) => m.role !== "system");
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelName,
        max_tokens: 2048,
        system,
        messages: turns.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.content?.[0]?.text ?? "";
  }

  if (provider === "GOOGLE") {
    // Gemini generateContent
    const model = resolveGoogleModel(modelName);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const turns = messages.filter((m) => m.role !== "system");
    const contents = turns.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: { maxOutputTokens: 2048 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  // OpenAI, Azure OpenAI, or Custom (all OpenAI-compatible)
  let endpoint: string;
  if (provider === "AZURE_OPENAI" && baseUrl) {
    endpoint = `${baseUrl}/openai/deployments/${modelName}/chat/completions?api-version=2024-02-01`;
    headers["api-key"] = apiKey;
  } else {
    endpoint = baseUrl ? `${baseUrl}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: provider === "AZURE_OPENAI" ? undefined : modelName,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`LLM API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Strict auth — no fallback to any other user
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const userMessage: string = body.message?.trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!userMessage) return NextResponse.json({ error: "message is required" }, { status: 400 });

    // Find active LLM config (checks DB assignments -> active DB configs -> environment variables)
    let config = await resolveAgentLLMConfig("BUDGET_AGENT");
    if (!config || !config.apiKey) {
      config = await resolveAgentLLMConfig("DOCUMENT_AGENT");
    }
    if (!config || !config.apiKey) {
      config = await resolveAgentLLMConfig();
    }

    if (!config || !config.apiKey) {
      return NextResponse.json(
        { reply: "No LLM provider is configured yet. Go to Settings → Multi-LLM Vault or set GEMINI_API_KEY in .env.local to enable AI financial assistance." },
        { status: 200 }
      );
    }

    const apiKey = config.apiKey;

    const context = await buildFinancialContext(user.id, userMessage);

    const systemPrompt = `You are a personal financial assistant for ${user.username}. You have access to their complete, up-to-date financial data shown below. Answer only about this user's finances — never speculate about others. Be direct, accurate, and use ZAR (R) formatting. Keep responses concise but complete.

${context}`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: userMessage },
    ];

    let reply: string;
    try {
      reply = await callLLM(config.provider, config.modelName, apiKey, config.baseUrl, messages);
    } catch (llmError: any) {
      const msg: string = llmError?.message ?? "";
      if (msg.includes("401") || msg.includes("invalid_api_key") || msg.includes("Incorrect API key")) {
        return NextResponse.json(
          { reply: `Your ${config.provider} API key is invalid or has been revoked. Please update it in Settings → AI Providers → ${config.displayName}.` },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { reply: `The AI service returned an error: ${msg.slice(0, 200)}. Please try again or check your API key in Settings.` },
        { status: 200 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message ?? "Chat failed" }, { status: 500 });
  }
}
