import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, maskApiKey, validateLLMKey, isVisionSupported } from "@/agents/llmProvider";

export async function GET() {
  try {
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

export async function POST(req: Request) {
  try {
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    const config = await prisma.lLMProviderConfig.findUnique({ where: { id } });
    if (!config) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }

    const validation = await validateLLMKey(config.provider, config.apiKeyEncrypted, config.modelName);

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
