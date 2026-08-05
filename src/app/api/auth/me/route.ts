import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("auth_session");
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const payload = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf-8"));
    if (!payload || !payload.userId || payload.exp < Date.now()) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName || user.username,
        jobTitle: user.profile?.jobTitle,
        employerName: user.profile?.employerName,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
