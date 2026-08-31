import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import {
  calculateAvailableCashflowSurplus,
  syncAllGoalsToBudget,
} from "@/lib/goalBudgetSync";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;

    const surplus = await calculateAvailableCashflowSurplus(userId, month);
    return NextResponse.json(surplus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const month = body.month || undefined;

    const result = await syncAllGoalsToBudget(userId, month);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
