import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agent, llmProviderConfigId } = body;

    const assignment = await prisma.agentModelAssignment.upsert({
      where: { agent },
      update: { llmProviderConfigId },
      create: { agent, llmProviderConfigId },
      include: { llmProviderConfig: true },
    });

    return NextResponse.json(assignment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
