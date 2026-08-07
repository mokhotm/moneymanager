import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/formatters";
import { getEffectiveUserId } from "@/lib/session";
import { getActiveCycleMonthKey } from "@/lib/budgetCycle";


export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ month: currentMonthKey(), items: [] });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") ?? await getActiveCycleMonthKey();

    const items = await prisma.budgetLineItem.findMany({
      where: {
        userId,
        month,
      },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ month, items });
  } catch {
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

    const body = await req.json();
    const item = await prisma.budgetLineItem.update({
      where: { id: body.id },
      data: {
        label: body.label,
        amount: body.amount,
        category: body.category,
        confidence: body.confidence,
        note: body.note,
      },
    });
    return NextResponse.json(item);
  } catch {
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

    await prisma.budgetLineItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete budget item" }, { status: 500 });
  }
}
