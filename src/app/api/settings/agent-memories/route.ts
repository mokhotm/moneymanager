import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";
import { recordAgentMemory, getUserAgentMemories, MemoryDomain, MemorySource } from "@/agents/agentMemoryService";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") as MemoryDomain | null;

    const memories = await getUserAgentMemories(userId, domain || undefined);

    return NextResponse.json({
      success: true,
      count: memories.length,
      memories,
    });
  } catch (error: any) {
    console.error("GET agent memories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { domain = "GEO", key, learnedPattern, resolvedValue = {}, confidence = 1.0, source = "USER_CORRECTION" } = body;

    if (!key || !learnedPattern) {
      return NextResponse.json({ error: "key and learnedPattern are required" }, { status: 400 });
    }

    const memory = await recordAgentMemory({
      userId,
      domain: domain as MemoryDomain,
      key,
      learnedPattern,
      resolvedValue,
      confidence: Number(confidence),
      source: source as MemorySource,
    });

    return NextResponse.json({
      success: true,
      memory,
      message: `Agent memory successfully reinforced for "${key}".`,
    });
  } catch (error: any) {
    console.error("POST agent memory error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Memory id required" }, { status: 400 });
    }

    await prisma.userAgentMemory.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({
      success: true,
      message: "Agent memory removed.",
    });
  } catch (error: any) {
    console.error("DELETE agent memory error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
