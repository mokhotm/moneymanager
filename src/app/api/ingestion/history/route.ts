import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let logs: any[] = [];
    try {
      if ((prisma as any).inboundEmailLog?.findMany) {
        logs = await (prisma as any).inboundEmailLog.findMany({
          where: { userId },
          orderBy: { receivedAt: "desc" },
          take: 50,
        });
      } else {
        logs = await prisma.$queryRawUnsafe(
          `SELECT * FROM "InboundEmailLog" WHERE "userId" = $1 ORDER BY "receivedAt" DESC LIMIT 50`,
          userId
        );
      }
    } catch (e) {
      try {
        logs = await prisma.$queryRawUnsafe(
          `SELECT * FROM "InboundEmailLog" WHERE "userId" = $1 ORDER BY "receivedAt" DESC LIMIT 50`,
          userId
        );
      } catch (err2) {
        console.warn("Could not query InboundEmailLog:", err2);
      }
    }

    return NextResponse.json({
      logs: logs || [],
    });
  } catch (error: any) {
    console.error("Fetch email history error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch email history" }, { status: 500 });
  }
}
