import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectGoalCompletion } from "@/agents/goalsAgent";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json([]);
    }

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
    });

    const enriched = goals.map((g) => {
      const proj = projectGoalCompletion(
        g.id,
        g.name,
        Number(g.currentAmount),
        g.targetAmount ? Number(g.targetAmount) : 0,
        Number(g.monthlyContribution)
      );
      return {
        ...g,
        projection: proj,
      };
    });

    return NextResponse.json(enriched);
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

    const body = await req.json();
    const goal = await prisma.goal.create({
      data: {
        userId,
        name: body.name,
        type: body.type,
        targetAmount: body.targetAmount ? parseFloat(body.targetAmount) : null,
        targetFormula: body.targetFormula,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        currentAmount: body.currentAmount ? parseFloat(body.currentAmount) : 0,
        monthlyContribution: body.monthlyContribution ? parseFloat(body.monthlyContribution) : 0,
        priority: body.priority ? parseInt(body.priority) : 1,
        note: body.note,
      },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
