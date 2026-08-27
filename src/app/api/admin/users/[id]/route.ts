import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, subscriptionTierCode, fullName, email } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user role and email if provided
    const updatedUserData: any = {};
    if (role && (role === "user" || role === "admin")) {
      updatedUserData.role = role;
    }
    if (email !== undefined) {
      updatedUserData.email = email;
    }

    if (Object.keys(updatedUserData).length > 0) {
      await prisma.user.update({
        where: { id },
        data: updatedUserData,
      });
    }

    // Update full name if provided
    if (fullName !== undefined && user.profile) {
      await prisma.userProfile.update({
        where: { userId: id },
        data: { fullName },
      });
    }

    // Update or assign subscription tier if provided
    if (subscriptionTierCode) {
      const tier = await prisma.subscriptionTier.findFirst({
        where: { code: subscriptionTierCode },
      });

      if (tier && user.profile) {
        await prisma.userSubscription.upsert({
          where: { profileId: user.profile.id },
          create: {
            profileId: user.profile.id,
            tierId: tier.id,
            status: "ACTIVE",
            billingCycle: "ANNUAL",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
          update: {
            tierId: tier.id,
            status: "ACTIVE",
          },
        });
      }
    }

    const finalUser = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            userSubscription: {
              include: { tier: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: finalUser,
    });
  } catch (error: any) {
    console.error("Admin user update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}
