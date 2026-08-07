import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectiveUserId } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        fullName: body.fullName,
        jobTitle: body.jobTitle,
        employerName: body.employerName,
        taxReference: body.taxReference,
        preferredCurrency: body.preferredCurrency ?? "ZAR",
      },
      create: {
        userId,
        fullName: body.fullName,
        jobTitle: body.jobTitle,
        employerName: body.employerName,
        taxReference: body.taxReference,
        preferredCurrency: body.preferredCurrency ?? "ZAR",
      },
    });

    if (body.email) {
      await prisma.user.update({
        where: { id: userId },
        data: { email: body.email },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return NextResponse.json({ user: updatedUser, profile: updatedProfile });
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
