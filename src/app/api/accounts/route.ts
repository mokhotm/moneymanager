import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json([]);
    }

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: { debt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const account = await prisma.account.create({
      data: {
        userId,
        name: body.name,
        institution: body.institution,
        accountNumberMasked: body.accountNumberMasked ?? null,
        type: body.type,
        currency: body.currency ?? "ZAR",
        openingBalance: body.openingBalance ?? 0,
        openingBalanceDate: body.openingBalanceDate ? new Date(body.openingBalanceDate) : null,
        isDebt: body.isDebt ?? false,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
