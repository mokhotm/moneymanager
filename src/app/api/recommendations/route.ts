import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId, getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to view Agent Recommendations." }, { status: 401 });
    }

    const recs = await prisma.agentRecommendation.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(recs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, action } = body; // action: "APPROVE" | "REJECT"

    const rec = await prisma.agentRecommendation.findUnique({ where: { id } });
    if (!rec) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
    }

    const updatedStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    const updated = await prisma.agentRecommendation.update({
      where: { id },
      data: {
        status: updatedStatus,
        reviewedAt: new Date(),
      },
    });

    // Write Audit Log Entry
    await prisma.auditLogEntry.create({
      data: {
        entityType: "AGENT_RECOMMENDATION",
        entityId: rec.id,
        fieldChanged: "status",
        oldValue: rec.status,
        newValue: updatedStatus,
        reason: rec.rationale,
        actor: rec.agent,
        changedBy: user?.username || "user",
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
