import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/formatters";
import { getEffectiveUserId } from "@/lib/session";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";
import { reconcileBudgetItemsForMonth, invalidateReconciliationCache } from "@/lib/budgetReconciliation";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ month: currentMonthKey(), items: [], summary: null });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? await getActiveCycleMonthKey();

    let items = await prisma.budgetLineItem.findMany({
      where: {
        userId,
        month,
      },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });

    if (items.length === 0) {
      // Find the most recent month with items
      const previousItems = await prisma.budgetLineItem.findMany({
        where: { userId },
        orderBy: { month: "desc" },
      });

      if (previousItems.length > 0) {
        const lastMonth = previousItems[0].month;
        const itemsToCopy = previousItems.filter(
          (i) => i.month === lastMonth && i.category !== "ONE_OFF_UNEXPECTED"
        );

        if (itemsToCopy.length > 0) {
          await prisma.budgetLineItem.createMany({
            data: itemsToCopy.map((i) => ({
              userId,
              month,
              category: i.category,
              label: i.label,
              amount: i.amount,
              isComputed: i.isComputed,
              sourceRef: i.sourceRef,
              confidence: i.confidence,
              note: i.note,
            })),
          });

          // Fetch them again to get the generated IDs
          items = await prisma.budgetLineItem.findMany({
            where: { userId, month },
            orderBy: [{ category: "asc" }, { createdAt: "asc" }],
          });
        }
      }
    }

    // Reconcile budget line items against cleared statement transactions
    const reconciliation = await reconcileBudgetItemsForMonth(userId, month, items);

    return NextResponse.json({
      month,
      items: reconciliation.items,
      summary: reconciliation.summary,
    });
  } catch (error) {
    console.error("Failed to fetch budget:", error);
    return NextResponse.json({ error: "Failed to fetch budget" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const item = await prisma.budgetLineItem.create({
      data: {
        userId,
        category: body.category,
        label: body.label,
        amount: body.amount,
        isComputed: body.isComputed ?? false,
        sourceRef: body.sourceRef ?? null,
        confidence: body.confidence ?? "ESTIMATED",
        note: body.note ?? null,
        month: body.month ?? await getActiveCycleMonthKey(),
      },
    });
    invalidateReconciliationCache(userId);
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create budget item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const id = body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const existing = await prisma.budgetLineItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    const item = await prisma.budgetLineItem.update({
      where: { id },
      data: {
        label: body.label,
        amount: typeof body.amount === "string" ? parseFloat(body.amount) : body.amount,
        category: body.category,
        confidence: body.confidence,
        note: body.note,
      },
    });
    invalidateReconciliationCache(userId);
    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update budget item:", error);
    return NextResponse.json({ error: "Failed to update budget item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await prisma.budgetLineItem.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    await prisma.budgetLineItem.delete({
      where: { id },
    });
    invalidateReconciliationCache(userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete budget item" }, { status: 500 });
  }
}
