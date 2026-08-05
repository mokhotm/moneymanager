import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: "Username and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Invalid username or password" }, { status: 401 });
    }

    // Set HTTP-only auth_session cookie
    const sessionToken = Buffer.from(JSON.stringify({ userId: user.id, username: user.username, exp: Date.now() + 86400000 })).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.profile?.fullName || user.username,
      },
    });

    response.cookies.set("auth_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400, // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
