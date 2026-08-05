import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

/** DELETE /api/bank-connections/[id] — revoke consent and delete the stored token */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connection = await prisma.bankConnection.findFirst({
      where: { id, account: { userId } },
    });
    if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

    // Mark REVOKED and clear the token immediately — revocation stops future syncs, not history
    await prisma.bankConnection.update({
      where: { id },
      data: {
        consentStatus: "REVOKED",
        accessTokenEncrypted: "", // token destroyed on revocation
      },
    });

    return NextResponse.json({ revoked: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** PATCH /api/bank-connections/[id] — update sync frequency or trigger a manual sync */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getEffectiveUserId(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const connection = await prisma.bankConnection.findFirst({
      where: { id, account: { userId } },
    });
    if (!connection) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    if (connection.consentStatus === "REVOKED") {
      return NextResponse.json({ error: "Connection has been revoked" }, { status: 409 });
    }

    const body = await req.json();
    const updated = await prisma.bankConnection.update({
      where: { id },
      data: {
        ...(body.syncFrequency && { syncFrequency: body.syncFrequency }),
        ...(body.markSynced && { lastSyncedAt: new Date() }),
      },
    });

    const { accessTokenEncrypted: _, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
