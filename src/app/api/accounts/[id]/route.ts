import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: { debt: { include: { settlementEvents: true } }, documents: true, auditLogs: true },
    });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const account = await prisma.account.update({
      where: { id },
      data: {
        name: body.name,
        institution: body.institution,
        accountNumberMasked: body.accountNumberMasked,
        type: body.type,
        currency: body.currency,
        openingBalance: body.openingBalance,
        openingBalanceDate: body.openingBalanceDate ? new Date(body.openingBalanceDate) : undefined,
        isDebt: body.isDebt,
        notes: body.notes,
      },
    });
    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
