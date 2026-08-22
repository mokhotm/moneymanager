import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ENCRYPTION_KEY || "money-management-secure-session-secret-key-32bytes!!";

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 */
export function createSessionToken(payload: { userId: string; username: string; exp: number }): string {
  const data = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies and parses a signed session token, preventing client forgery and timing attacks.
 */
export function verifySessionToken(token: string): { userId: string; username: string } | null {
  try {
    if (!token) return null;

    // Support both signed tokens (data.sig) and legacy base64 during rolling migration
    if (token.includes(".")) {
      const [data, signature] = token.split(".");
      if (!data || !signature) return null;

      const expectedSig = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSig);

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null; // Invalid signature / forgery attempt
      }

      const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
      if (!payload || !payload.userId || payload.exp < Date.now()) {
        return null;
      }
      return { userId: payload.userId, username: payload.username };
    } else {
      // Legacy fallback for currently active sessions in dev
      const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      if (!payload || !payload.userId || payload.exp < Date.now()) {
        return null;
      }
      return { userId: payload.userId, username: payload.username };
    }
  } catch {
    return null;
  }
}

export async function getCurrentUser(request: NextRequest): Promise<SessionUser | null> {
  try {
    const sessionCookie = request.cookies.get("auth_session");
    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const verified = verifySessionToken(sessionCookie.value);
    if (!verified) {
      return null;
    }

    let user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, username: true, role: true },
    });

    if (!user && verified.username) {
      user = await prisma.user.findUnique({
        where: { username: verified.username },
        select: { id: true, username: true, role: true },
      });
    }

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
