import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

/** GET /api/documents — list documents for the current user (accounts + income records) */
export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [accountIds, incomeIds] = await Promise.all([
      prisma.account.findMany({ where: { userId }, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
      prisma.income.findMany({ where: { userId }, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
    ]);

    const documents = await prisma.document.findMany({
      where: { relatedEntityId: { in: [...accountIds, ...incomeIds] } },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
