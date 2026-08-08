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

    const validation = await validateLLMKey(provider, apiKey, modelName);
    const supportsVision = isVisionSupported(provider, modelName);

    const config = await prisma.lLMProviderConfig.create({
      data: {
        provider,
        displayName: displayName || `${provider} Key`,
        apiKeyEncrypted: encryptApiKey(apiKey),
        baseUrl: baseUrl || null,
        modelName: modelName || "default",
        supportsVision,
        status: validation.valid ? "ACTIVE" : "INVALID_KEY",
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

    const body = await req.json();
    const { id } = body;

    const config = await prisma.lLMProviderConfig.findUnique({ where: { id } });
    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const decryptedKey = decryptApiKey(config.apiKeyEncrypted);
    const validation = await validateLLMKey(config.provider, decryptedKey, config.modelName);

    const updated = await prisma.lLMProviderConfig.update({
      where: { id },
      data: {
        status: validation.valid ? "ACTIVE" : "INVALID_KEY",
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
