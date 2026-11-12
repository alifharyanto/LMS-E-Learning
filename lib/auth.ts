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
  const users = await queryRows<(import("mysql2").RowDataPacket & { session_version: number; account_status: string })[]>(
    "SELECT session_version, account_status FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  const account = users[0];
  if (!account || account.account_status !== "active") {
    throw new Error("Akun tidak aktif.");
  }

  const lifetime = remember ? "30d" : "120m";
  const token = await new SignJWT({ session_version: Number(account.session_version) })
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

    const users = await queryRows<(User & import("mysql2").RowDataPacket & { account_status: string; session_version: number })[]>(
      "SELECT id, username, email, full_name, profile_photo, role, account_status, session_version FROM users WHERE id = ? LIMIT 1",
      [userId],
    );

    const user = users[0];
    if (!user || user.account_status !== "active" || Number(payload.session_version ?? 0) !== Number(user.session_version)) return null;
    return {
      id: Number(user.id),
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      profile_photo: user.profile_photo,
      role: user.role,
    };
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