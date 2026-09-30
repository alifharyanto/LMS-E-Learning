import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { queryRows } from "@/lib/db";

export const SESSION_COOKIE = "courseup_session";

export type User = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  profile_photo: string;
  role: "admin" | "student";
};

function sessionSecret() {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("APP_SESSION_SECRET must be configured in production.");
  }

  return new TextEncoder().encode(secret || "courseup-local-development-session-secret");
}

export async function createSession(userId: number, remember: boolean) {
  const lifetime = remember ? "30d" : "120m";
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(lifetime)
    .sign(sessionSecret());

  return token;
}

export async function readSession(token?: string) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    if (!Number.isSafeInteger(userId) || userId < 1) return null;

    const users = await queryRows<(User & import("mysql2").RowDataPacket)[]>(
      "SELECT id, username, email, full_name, profile_photo, role FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    return users[0] ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return readSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getRequestUser(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)courseup_session=([^;]+)/)?.[1];
  return readSession(cookie ? decodeURIComponent(cookie) : undefined);
}