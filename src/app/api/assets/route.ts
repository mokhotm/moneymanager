import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json([]);
    }

    const assets = await prisma.asset.findMany({
      where: { userId },
      include: { account: true },
      orderBy: { currentValue: "desc" },
    });
    return NextResponse.json(assets);
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
    const asset = await prisma.asset.create({
      data: {
        userId,
        name: body.name,
        type: body.type,
        currentValue: body.currentValue,
        valueConfidence: body.valueConfidence ?? "ESTIMATED",
        valueSource: body.valueSource,
        linkedDebtId: body.linkedDebtId,
        accountId: body.accountId,
        lastValuedDate: body.lastValuedDate ? new Date(body.lastValuedDate) : new Date(),
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
