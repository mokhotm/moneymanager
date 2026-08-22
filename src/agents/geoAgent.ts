import { prisma } from "@/lib/prisma";
import { decryptApiKey, resolveGoogleModel } from "./llmProvider";

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
2. The exact physical location, corner, shopping centre, street, suburb, city, and province in South Africa.
3. Rooftop-accurate latitude and longitude GPS coordinates (South Africa latitudes are negative, around -25 to -34, longitudes +18 to +32).
4. Major regional hub (e.g. "Springs & Bakerton", "East Rand", "Pretoria & Centurion", "Johannesburg Metro", "Bloemfontein", "National / Other").
5. Spending Category ("Groceries & Household", "Dining & Treats", "Fuel & Transport", "Auto & Repairs", "Retail & Shopping", "Education & Tuition", "Municipal Utilities").

Special South African Knowledge:
- Bakerton is a suburb in Springs, Gauteng. Al-Aswad Supermarket & Butchery is on Cnr Honeysuckle Dr & Pampas Rd, Bakerton (-26.2249, 28.4772). Bakerton Veg is on Blossom Rd & Honeysuckle Dr (-26.2235, 28.4780). RK Store is on Pampas Rd (-26.2252, 28.4770).
- Geduld is a suburb in Springs. Springbok SuperSPAR is at 102 4th Avenue, Geduld (-26.2439, 28.4286).
- Springs CBD / The Avenues Shopping Centre is on 6th Street, Springs Central (-26.2520, 28.4380).
- Springs Mall is on Jan Smuts Rd, Casseldale, Springs (-26.2625, 28.4550).
- Bapsfontein: BP Bapsfontein Oasis is on Cnr Magic Ave & Delmas Rd R50 (-26.0044, 28.4133). Astron Energy is at R50 & R25 (-25.9985, 28.4140).
- Erasmuskloof / Pretoria East: Castle Gate Shopping Centre is on Solomon Mahlangu Dr & Van Ryneveld Ave (-25.8085, 28.2612).
- Bloemfontein / UFS: Nelson Mandela Dr, Park West (-29.1107, 26.1850).

Output MUST strictly be valid JSON adhering to this schema:
{
  "results": [
    {
      "merchant": "<raw search string>",
      "cleanMerchant": "<Official Store/Company Name>",
      "locationName": "<Full Address or Shopping Center>",
      "suburb": "<Suburb>",
      "city": "<City/Town>",
      "region": "<Regional Hub>",
      "lat": <number>,
      "lng": <number>,
      "category": "<Category>",
      "confidence": <0.0 to 1.0>,
      "rationale": "<1 sentence reasoning>"
    }
  ]
}`;

export async function calibrateLocationsWithAI(
  rawDescriptions: string[],
  userId?: string
): Promise<AIGeoLocationResult[]> {
  if (!rawDescriptions || rawDescriptions.length === 0) return [];

  // 1. Retrieve configured LLM provider from DB or environment
  let provider = "GOOGLE";
  let apiKey = process.env.GEMINI_API_KEY || "";
  let modelName = "gemini-3.7-flash";
  let baseUrl: string | null = null;

  try {
    const activeConfig = await prisma.lLMProviderConfig.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    });

    if (activeConfig) {
      provider = activeConfig.provider;
      modelName = activeConfig.modelName;
      baseUrl = activeConfig.baseUrl;
      const decrypted = decryptApiKey(activeConfig.apiKeyEncrypted);
      if (decrypted && decrypted !== "__DECRYPT_FAILED__") {
        apiKey = decrypted;
      }
    }
  } catch (e) {
    console.warn("Using fallback AI geocoding credentials:", e);
  }

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
              parts: [{ text: `${SA_GEO_SYSTEM_PROMPT}\n\n${userPrompt}` }],
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
            { role: "system", content: SA_GEO_SYSTEM_PROMPT },
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
          system: SA_GEO_SYSTEM_PROMPT,
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
    return Array.isArray(parsed.results) ? parsed.results : [];
  } catch (err) {
    console.error("AI Geo Calibration failed:", err);
    return [];
  }
}
