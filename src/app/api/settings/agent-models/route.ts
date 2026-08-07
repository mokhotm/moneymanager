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
