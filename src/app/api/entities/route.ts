import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { getEntitiesForUser } from "@/services/entityService";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entities = await getEntitiesForUser(userId);
    return NextResponse.json({
      success: true,
      activeEntityId: entities[0]?.id || null,
      entities,
    });
  } catch (error: any) {
    console.error("Entities API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load entities" }, { status: 500 });
  }
}
