import { prisma } from "@/lib/prisma";
import { resolveAgentLLMConfig, resolveGoogleModel, decryptApiKey } from "./llmProvider";
import { searchNominatimAddress } from "@/lib/nominatimGeoService";
import { getPromptAugmentationMemories, recordAgentMemory } from "./agentMemoryService";

export interface AIGeoLocationResult {
  merchant: string;
  cleanMerchant: string;
  locationName: string;
  suburb: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  category: string;
  confidence: number;
  rationale: string;
}

const SA_GEO_SYSTEM_PROMPT = `You are an elite South African Financial Geocoding & Merchant Intelligence AI Agent.
Your job is to analyze raw South African bank statement transaction descriptions (e.g. Standard Bank, FNB, Nedbank, Capitec) and determine:
1. The exact clean merchant trading name (removing bank noise, POS prefixes like "C*", "S2S*", "POS", terminal numbers, card suffixes).
2. The merchant physical location / branch / suburb (e.g. "Woodmead Retail Park", "Menlyn Park", "V&A Waterfront", "Centurion Mall").
3. Suburb, City, and South African Province / Region.
4. Approximate GPS Coordinates (latitude, longitude) for South Africa.
5. Standard Spending Category: Groceries, Fuel & Transport, Utilities, Dining & Takeout, Shopping & Retail, Health & Medical, Entertainment, Subscriptions, Insurance, Debt Payment, Transfer, Income, Cash & ATM, Other.
6. Confidence Score (0.0 to 1.0).
7. Brief 1-sentence analytical rationale.

Respond with strict JSON matching this schema:
{
  "results": [
    {
      "merchant": "raw description",
      "cleanMerchant": "Pick n Pay",
      "locationName": "Pick n Pay Woodmead",
      "suburb": "Woodmead",
      "city": "Sandton",
      "region": "Gauteng",
      "lat": -26.0617,
      "lng": 28.0863,
      "category": "Groceries",
      "confidence": 0.95,
      "rationale": "Identified standard Pick n Pay store in Woodmead Sandton."
    }
  ]
}`;

export async function calibrateLocationsWithAI(
  rawDescriptions: string[],
  userId?: string
): Promise<AIGeoLocationResult[]> {
  if (!rawDescriptions || rawDescriptions.length === 0) return [];

  // 1. Retrieve configured LLM provider from DB or environment
  const config = await resolveAgentLLMConfig("DOCUMENT_AGENT");
  if (!config || !config.apiKey) {
    console.warn("No active LLM configuration available for Geo Agent");
    return [];
  }

  const provider = config.provider;
  const apiKey = config.apiKey;
  const modelName = config.modelName;
  const baseUrl = config.baseUrl;

  const learnedMemories = userId ? await getPromptAugmentationMemories(userId, ["GEO", "PREFERENCE"]) : "";
  const effectiveSystemPrompt = `${SA_GEO_SYSTEM_PROMPT}\n${learnedMemories}`;

  const userPrompt = `Analyze and geocode these South African bank transaction statement descriptions:\n${rawDescriptions
    .slice(0, 15)
    .map((d, i) => `${i + 1}. "${d}"`)
    .join("\n")}\n\nRespond ONLY with valid JSON.`;

  try {
    let rawText = "";

    if (provider === "GOOGLE" && apiKey) {
      const model = resolveGoogleModel(modelName);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${effectiveSystemPrompt}\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else if (provider === "OPENAI" && apiKey) {
      const url = baseUrl ? `${baseUrl}/v1/chat/completions` : "https://api.openai.com/v1/chat/completions";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName || "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: effectiveSystemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      rawText = data.choices?.[0]?.message?.content ?? "";
    } else if (provider === "ANTHROPIC" && apiKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelName || "claude-3-5-sonnet-20241022",
          max_tokens: 2048,
          system: effectiveSystemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      rawText = data.content?.[0]?.text ?? "";
    }

    if (!rawText) return [];

    // Parse JSON
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    const results: AIGeoLocationResult[] = Array.isArray(parsed.results) ? parsed.results : [];

    // Persist verified results to long-term Agent Memory
    if (userId && results.length > 0) {
      for (const item of results) {
        if (item.confidence >= 0.8) {
          recordAgentMemory({
            userId,
            domain: "GEO",
            key: item.merchant,
            learnedPattern: `${item.cleanMerchant} (${item.locationName}) in ${item.suburb || item.city}`,
            resolvedValue: item,
            confidence: item.confidence,
            source: "AI_REFLECTION",
          }).catch((err) => console.warn("Failed to persist learned agent memory:", err));
        }
      }
    }

    return results;
  } catch (err) {
    console.error("AI Geo Calibration failed:", err);
    return [];
  }
}
