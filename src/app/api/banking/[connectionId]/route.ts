import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { connectionId } = await params;

    const connection = await prisma.bankConnection.findFirst({
      where: { id: connectionId, account: { userId: user.id } },
      include: { account: true },
    });

    if (!connection) {
      return NextResponse.json({ error: "Bank connection not found" }, { status: 404 });
    }

    // Revoke consent and delete the connection
    await prisma.bankConnection.delete({
      where: { id: connectionId },
    });

    return NextResponse.json({
      success: true,
      message: `Disconnected ${connection.account.name} from bank sync feed.`,
    });
  } catch (error: any) {
    console.error("Banking disconnect error:", error);
    return NextResponse.json({ error: error.message || "Failed to disconnect bank" }, { status: 500 });
  }
}
