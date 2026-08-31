import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { projectGoalCompletion, evaluateGoalFeasibilityWithAI } from "@/agents/goalsAgent";
import { getEffectiveUserId } from "@/lib/session";
import { syncGoalToBudget } from "@/lib/goalBudgetSync";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
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
        currentAmount: Number(g.currentAmount),
        targetAmount: g.targetAmount ? Number(g.targetAmount) : null,
        monthlyContribution: Number(g.monthlyContribution),
        allocatedBudgetAmount: Number(g.allocatedBudgetAmount || 0),
        aiRecommendedAllocation: g.aiRecommendedAllocation ? Number(g.aiRecommendedAllocation) : null,
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
    const linkToBudget = Boolean(body.linkToBudget);
    const autoAllocateSurplus = body.autoAllocateSurplus !== undefined ? Boolean(body.autoAllocateSurplus) : true;

    const goal = await prisma.goal.create({
      data: {
        userId,
        name: body.name,
        type: body.type,
        targetAmount: body.targetAmount ? parseFloat(body.targetAmount) : null,
        targetFormula: body.targetFormula || null,
        targetDate: body.targetDate ? new Date(body.targetDate) : null,
        currentAmount: body.currentAmount ? parseFloat(body.currentAmount) : 0,
        monthlyContribution: body.monthlyContribution ? parseFloat(body.monthlyContribution) : 0,
        priority: body.priority ? parseInt(body.priority) : 1,
        note: body.note || null,
        linkToBudget,
        autoAllocateSurplus,
        allocatedBudgetAmount: 0,
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "GOAL",
        entityId: goal.id,
        fieldChanged: "createdAt",
        newValue: goal.name,
        reason: `Created goal ${goal.name}`,
        actor: "USER",
      },
    });

    // If budget link is enabled, sync to active budget cycle immediately
    if (linkToBudget) {
      try {
        await syncGoalToBudget(goal.id, userId);
      } catch (err) {
        console.warn("Initial goal-budget sync notice:", err);
      }
    }

    // Proactively run AI Feasibility analysis in background
    evaluateGoalFeasibilityWithAI(goal.id, userId).catch((e) =>
      console.warn("Async AI goal evaluation background note:", e)
    );

    return NextResponse.json(goal, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get("id");
    const body = await req.json();

    const targetId = goalId || body.id;
    if (!targetId) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({
      where: { id: targetId },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Handle Quick Contribution deposit vs Full Edit
    let newCurrentAmount = Number(existing.currentAmount);
    if (body.depositAmount) {
      newCurrentAmount += parseFloat(body.depositAmount);
    } else if (body.currentAmount !== undefined) {
      newCurrentAmount = parseFloat(body.currentAmount);
    }

    const linkToBudget =
      body.linkToBudget !== undefined ? Boolean(body.linkToBudget) : existing.linkToBudget;
    const autoAllocateSurplus =
      body.autoAllocateSurplus !== undefined
        ? Boolean(body.autoAllocateSurplus)
        : existing.autoAllocateSurplus;

    const updated = await prisma.goal.update({
      where: { id: targetId },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        type: body.type !== undefined ? body.type : existing.type,
        targetAmount:
          body.targetAmount !== undefined
            ? body.targetAmount
              ? parseFloat(body.targetAmount)
              : null
            : existing.targetAmount,
        currentAmount: newCurrentAmount,
        monthlyContribution:
          body.monthlyContribution !== undefined
            ? parseFloat(body.monthlyContribution)
            : existing.monthlyContribution,
        priority: body.priority !== undefined ? parseInt(body.priority) : existing.priority,
        note: body.note !== undefined ? body.note : existing.note,
        linkToBudget,
        autoAllocateSurplus,
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "GOAL",
        entityId: targetId,
        fieldChanged: body.depositAmount ? "currentAmount (deposit)" : "updatedFields",
        oldValue: String(existing.currentAmount),
        newValue: String(updated.currentAmount),
        reason: body.depositAmount
          ? `Deposited R${body.depositAmount} into ${updated.name}`
          : `Updated goal ${updated.name}`,
        actor: "USER",
      },
    });

    // Synchronize to monthly budget if link setting changed or contribution updated
    try {
      await syncGoalToBudget(targetId, userId);
    } catch (err) {
      console.warn("Goal-budget sync notice on update:", err);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get("id");

    if (!goalId) {
      return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Clean up budget line items before deleting
    await prisma.budgetLineItem.deleteMany({
      where: {
        userId,
        sourceRef: `goal:${goalId}`,
      },
    });

    await prisma.goal.delete({ where: { id: goalId } });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "GOAL",
        entityId: goalId,
        fieldChanged: "deletedAt",
        oldValue: existing.name,
        reason: `Deleted goal ${existing.name}`,
        actor: "USER",
      },
    });

    return NextResponse.json({ success: true, message: "Goal deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
