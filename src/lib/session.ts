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
 * Strict User ID resolver — returns authenticated User ID or null if unauthenticated.
 * Security enforcement: NEVER fall back to demo user data when unauthenticated.
 */
export async function getEffectiveUserId(request: NextRequest): Promise<string | null> {
  const user = await getCurrentUser(request);
  return user ? user.id : null;
}
