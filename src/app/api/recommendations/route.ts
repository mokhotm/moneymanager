import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId, getCurrentUser } from "@/lib/session";
import { getUserEntityScope, isRecommendationOwnedByUser } from "@/lib/userEntityScope";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Log in to view Agent Recommendations." }, { status: 401 });
    }

    const scope = await getUserEntityScope(user.id);
    if (scope.allEntityIds.length === 0 && !scope.userProfileId) {
      return NextResponse.json([]);
    }

    const allRecs = await prisma.agentRecommendation.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Filter to only recommendations that belong to the requesting user's entities or profile
    const userRecs = allRecs.filter((r) => isRecommendationOwnedByUser(r.payload, scope));

    return NextResponse.json(userRecs);
  } catch (error: any) {
    console.error("GET /api/recommendations error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch recommendations" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await getUserEntityScope(userId);

    const body = await req.json();
    const { id, action } = body; // action: "APPROVE" | "REJECT"

    if (!id) {
      return NextResponse.json({ error: "Recommendation ID is required" }, { status: 400 });
    }

    const rec = await prisma.agentRecommendation.findUnique({ where: { id } });
    if (!rec || !isRecommendationOwnedByUser(rec.payload, scope)) {
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
    console.error("PUT /api/recommendations error:", error);
    return NextResponse.json({ error: error.message || "Failed to update recommendation" }, { status: 500 });
  }
}
