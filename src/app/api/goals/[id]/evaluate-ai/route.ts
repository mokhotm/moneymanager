import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { evaluateGoalFeasibilityWithAI } from "@/agents/goalsAgent";
import { syncGoalToBudget } from "@/lib/goalBudgetSync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId } = await params;
    if (!goalId) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    // Run AI Feasibility Analysis
    const evaluation = await evaluateGoalFeasibilityWithAI(goalId, userId);

    // If goal is linked to budget and autoAllocateSurplus is true, update the budget allocation
    await syncGoalToBudget(goalId, userId);

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error: any) {
    console.error("AI Goal Evaluation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to evaluate goal" }, { status: 500 });
  }
}
