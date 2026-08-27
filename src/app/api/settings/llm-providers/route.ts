import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkFeatureAccess } from "@/lib/subscriptionGate";
import { encryptApiKey, decryptApiKey, maskApiKey, validateLLMKey, isVisionSupported } from "@/agents/llmProvider";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to view LLM Provider settings." }, { status: 401 });
    }

    const configs = await prisma.lLMProviderConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    const maskedConfigs = configs.map((c) => ({
      ...c,
      apiKeyMasked: maskApiKey(c.apiKeyEncrypted),
      apiKeyEncrypted: undefined, // Never send raw encrypted key in response
    }));

    return NextResponse.json(maskedConfigs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to modify LLM Provider settings." }, { status: 401 });
    }

    const featureCheck = await checkFeatureAccess(user.id, "byokLLM");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: "FEATURE_LOCKED",
          requiredTier: "PRO_WEALTH",
          message: "BYOK Custom LLM Vault requires Pro Wealth Accelerator or Executive Enterprise tier.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { provider, displayName, apiKey, baseUrl, modelName } = body;

    const dbProvider = (() => {
      const p = String(provider || "").toUpperCase();
      if (p === "GOOGLE" || p.includes("GEMINI")) return "GOOGLE";
      if (p === "ANTHROPIC" || p.includes("CLAUDE")) return "ANTHROPIC";
      if (p === "OPENAI" || p.includes("GPT")) return "OPENAI";
      if (p.includes("AZURE")) return "AZURE_OPENAI";
      return "CUSTOM";
    })();

    const validation = await validateLLMKey(provider, apiKey, modelName);
    const supportsVision = isVisionSupported(provider, modelName);

    const config = await prisma.lLMProviderConfig.create({
      data: {
        provider: dbProvider,
        displayName: displayName || `${provider} Key`,
        apiKeyEncrypted: encryptApiKey(apiKey),
        baseUrl: baseUrl || null,
        modelName: modelName || "default",
        supportsVision,
        status: validation.valid ? "ACTIVE" : "ACTIVE",
        lastValidatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        ...config,
        apiKeyMasked: maskApiKey(config.apiKeyEncrypted),
        validation,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to modify LLM Provider settings." }, { status: 401 });
    }

    const featureCheck = await checkFeatureAccess(user.id, "byokLLM");
    if (!featureCheck.allowed) {
      return NextResponse.json(
        {
          error: "FEATURE_LOCKED",
          requiredTier: "PRO_WEALTH",
          message: "BYOK Custom LLM Vault requires Pro Wealth Accelerator or Executive Enterprise tier.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, displayName, apiKey, baseUrl, modelName, provider, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Config ID required" }, { status: 400 });
    }

    const config = await prisma.lLMProviderConfig.findUnique({ where: { id } });
    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    let finalProvider = config.provider;
    if (provider) {
      const p = String(provider).toUpperCase();
      if (p === "GOOGLE" || p.includes("GEMINI")) finalProvider = "GOOGLE";
      else if (p === "ANTHROPIC" || p.includes("CLAUDE")) finalProvider = "ANTHROPIC";
      else if (p === "OPENAI" || p.includes("GPT")) finalProvider = "OPENAI";
      else if (p.includes("AZURE")) finalProvider = "AZURE_OPENAI";
      else finalProvider = "CUSTOM";
    }

    const finalModelName = modelName !== undefined ? modelName : config.modelName;
    const finalBaseUrl = baseUrl !== undefined ? baseUrl : config.baseUrl;
    const finalDisplayName = displayName !== undefined ? displayName : config.displayName;

    let finalApiKeyEncrypted = config.apiKeyEncrypted;
    let rawKeyToValidate: string;

    if (apiKey && apiKey.trim().length > 0 && !apiKey.includes("••••")) {
      finalApiKeyEncrypted = encryptApiKey(apiKey.trim());
      rawKeyToValidate = apiKey.trim();
    } else {
      rawKeyToValidate = decryptApiKey(config.apiKeyEncrypted);
    }

    const validation = await validateLLMKey(finalProvider, rawKeyToValidate, finalModelName);
    const supportsVision = isVisionSupported(finalProvider, finalModelName);

    const updated = await prisma.lLMProviderConfig.update({
      where: { id },
      data: {
        provider: finalProvider,
        displayName: finalDisplayName,
        apiKeyEncrypted: finalApiKeyEncrypted,
        baseUrl: finalBaseUrl,
        modelName: finalModelName,
        supportsVision,
        status: status || (validation.valid ? "ACTIVE" : "ACTIVE"),
        lastValidatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...updated,
      apiKeyMasked: maskApiKey(updated.apiKeyEncrypted),
      validation,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to modify LLM Provider settings." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Config ID required" }, { status: 400 });
    }

    await prisma.lLMProviderConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
