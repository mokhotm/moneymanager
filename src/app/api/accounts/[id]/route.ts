import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id },
      include: { debt: { include: { settlementEvents: true } } },
    });

    if (!account || account.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const account = await prisma.account.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        institution: body.institution !== undefined ? body.institution : existing.institution,
        accountNumberMasked: body.accountNumberMasked !== undefined ? body.accountNumberMasked : existing.accountNumberMasked,
        type: body.type !== undefined ? body.type : existing.type,
        currency: body.currency !== undefined ? body.currency : existing.currency,
        openingBalance: body.openingBalance !== undefined ? parseFloat(body.openingBalance) : existing.openingBalance,
        openingBalanceDate: body.openingBalanceDate ? new Date(body.openingBalanceDate) : existing.openingBalanceDate,
        isDebt: body.isDebt !== undefined ? body.isDebt : existing.isDebt,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "ACCOUNT",
        entityId: id,
        fieldChanged: "openingBalance & details",
        oldValue: String(existing.openingBalance),
        newValue: String(account.openingBalance),
        reason: "User updated account details via UI modal",
        actor: "USER",
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.account.delete({ where: { id } });

    await prisma.auditLogEntry.create({
      data: {
        entityType: "ACCOUNT",
        entityId: id,
        fieldChanged: "deletedAt",
        oldValue: existing.name,
        reason: `User deleted account ${existing.name}`,
        actor: "USER",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
