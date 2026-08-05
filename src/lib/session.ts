import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

export async function getCurrentUser(request: NextRequest): Promise<SessionUser | null> {
  try {
    const sessionCookie = request.cookies.get("auth_session");
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf-8"));
    if (!payload || !payload.userId || payload.exp < Date.now()) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true },
    });

    return user;
  } catch {
    return null;
  }
}

/**
  * Helper to get active user ID or default to demo user ID if unauthenticated (for public demo fallback)
  */
export async function getEffectiveUserId(request: NextRequest): Promise<string | null> {
  const user = await getCurrentUser(request);
  if (user) {
    return user.id;
  }

  // Fallback to primary demo user (mokhotm) if unauthenticated
  const demoUser = await prisma.user.findFirst({
    where: { username: "mokhotm" },
    select: { id: true },
  });

  return demoUser?.id ?? null;
}
