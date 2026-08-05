import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json([]);
    }

    const income = await prisma.income.findMany({
      where: { userId },
      include: { incomeEvents: { orderBy: { dateReceived: "desc" } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(income);
  } catch {
    return NextResponse.json({ error: "Failed to fetch income" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const income = await prisma.income.create({
      data: {
        userId,
        sourceName: body.sourceName,
        recurringAmount: body.recurringAmount,
        recurringAmountConfidence: body.recurringAmountConfidence ?? "ESTIMATED",
        payDayOfMonth: body.payDayOfMonth ?? 25,
        lastConfirmedDate: body.lastConfirmedDate ? new Date(body.lastConfirmedDate) : null,
      },
    });
    return NextResponse.json(income, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create income" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const current = await prisma.income.findUnique({ where: { id: body.id } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.income.update({
      where: { id: body.id },
      data: {
        sourceName: body.sourceName,
        recurringAmount: body.recurringAmount,
        recurringAmountConfidence: body.recurringAmountConfidence,
        payDayOfMonth: body.payDayOfMonth,
        lastConfirmedDate: body.lastConfirmedDate ? new Date(body.lastConfirmedDate) : undefined,
      },
    });

    // Audit if recurring amount changed
    if (Number(current.recurringAmount) !== Number(body.recurringAmount)) {
      await prisma.auditLogEntry.create({
        data: {
          entityType: "INCOME",
          entityId: body.id,
          fieldChanged: "recurringAmount",
          oldValue: String(current.recurringAmount),
          newValue: String(body.recurringAmount),
          reason: body.reason ?? "User update",
        },
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update income" }, { status: 500 });
  }
}
