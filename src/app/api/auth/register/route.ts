import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, fullName, jobTitle, employerName } = await request.json();

    if (!username || !username.trim()) {
      return NextResponse.json({ success: false, error: "Username is required" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check existing username
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: "Username is already taken. Please choose another." }, { status: 400 });
    }

    // Check existing email if provided
    if (email && email.trim()) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: email.trim() },
      });
      if (existingEmail) {
        return NextResponse.json({ success: false, error: "Email address is already registered." }, { status: 400 });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and profile
    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        passwordHash,
        email: email && email.trim() ? email.trim() : null,
        role: "user",
        profile: {
          create: {
            fullName: fullName && fullName.trim() ? fullName.trim() : cleanUsername,
            jobTitle: jobTitle && jobTitle.trim() ? jobTitle.trim() : "User",
            employerName: employerName && employerName.trim() ? employerName.trim() : null,
          },
        },
      },
      include: { profile: true },
    });

    // Set signed HTTP-only auth_session cookie for instant login
    const sessionToken = createSessionToken({
      userId: newUser.id,
      username: newUser.username,
      exp: Date.now() + 86400000,
    });

    const response = NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.profile?.fullName || newUser.username,
        jobTitle: newUser.profile?.jobTitle || "User",
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
    return NextResponse.json({ success: false, error: error.message || "Registration failed" }, { status: 500 });
  }
}
