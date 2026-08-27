import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        profile: {
          include: {
            userSubscription: {
              include: {
                tier: true,
              },
            },
          },
        },
        _count: {
          select: {
            accounts: true,
            incomes: true,
            goals: true,
            budgetItems: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      fullName: u.profile?.fullName || null,
      jobTitle: u.profile?.jobTitle || null,
      employerName: u.profile?.employerName || null,
      taxReference: u.profile?.taxReference || null,
      preferredCurrency: u.profile?.preferredCurrency || "ZAR",
      subscription: u.profile?.userSubscription
        ? {
            id: u.profile.userSubscription.id,
            status: u.profile.userSubscription.status,
            tierCode: u.profile.userSubscription.tier?.code || "EXECUTIVE_ENTERPRISE",
            tierName: u.profile.userSubscription.tier?.name || "Executive Enterprise",
            billingCycle: u.profile.userSubscription.billingCycle,
          }
        : null,
      counts: {
        accounts: u._count.accounts,
        incomes: u._count.incomes,
        goals: u._count.goals,
        budgetItems: u._count.budgetItems,
      },
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error: any) {
    console.error("Admin users API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}
