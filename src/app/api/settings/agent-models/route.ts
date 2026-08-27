import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to view agent model assignments." }, { status: 401 });
    }

    const assignments = await prisma.agentModelAssignment.findMany({
      include: { llmProviderConfig: true },
    });

    const mapped = assignments.map((a) => ({
      id: a.id,
      agent: a.agent,
      configId: a.llmProviderConfigId,
      provider: a.llmProviderConfig.provider,
      displayName: a.llmProviderConfig.displayName,
      modelName: a.llmProviderConfig.modelName,
      supportsVision: a.llmProviderConfig.supportsVision,
      status: a.llmProviderConfig.status,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to modify agent model assignments." }, { status: 401 });
    }

    const body = await req.json();
    const { agent, llmProviderConfigId } = body;

    if (!agent || !llmProviderConfigId) {
      return NextResponse.json({ error: "agent and llmProviderConfigId are required" }, { status: 400 });
    }

    const targetConfig = await prisma.lLMProviderConfig.findUnique({
      where: { id: llmProviderConfigId },
    });

    if (!targetConfig) {
      return NextResponse.json({ error: "Specified LLM provider config not found" }, { status: 404 });
    }

    const assignment = await prisma.agentModelAssignment.upsert({
      where: { agent },
      update: { llmProviderConfigId },
      create: { agent, llmProviderConfigId },
      include: { llmProviderConfig: true },
    });

    const mapped = {
      id: assignment.id,
      agent: assignment.agent,
      configId: assignment.llmProviderConfigId,
      provider: assignment.llmProviderConfig.provider,
      displayName: assignment.llmProviderConfig.displayName,
      modelName: assignment.llmProviderConfig.modelName,
      supportsVision: assignment.llmProviderConfig.supportsVision,
      status: assignment.llmProviderConfig.status,
    };

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("Error persisting agent model assignment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
