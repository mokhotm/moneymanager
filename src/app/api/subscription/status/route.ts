import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { getUserSubscriptionDetails } from "@/lib/subscriptionGate";

export async function GET(request: NextRequest) {
  try {
    const userId = await getEffectiveUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getUserSubscriptionDetails(userId);
    if (!subscription) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.error("GET /api/subscription/status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status", message: error?.message },
      { status: 500 }
    );
  }
}
