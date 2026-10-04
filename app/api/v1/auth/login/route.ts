import type { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession, type User } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, readJsonLimited } from "@/lib/http";
import { enforceAuthRateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieHeader(token: string, persistent: boolean) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = persistent ? "; Max-Age=2592000" : "";
  return `courseup_session=${token}; Path=/; HttpOnly; SameSite=Lax${secure}${maxAge}`;
}

const loginSchema = z.object({
  identity: z.string().trim().min(1).max(150).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(256),
  remember: z.boolean().optional(),
}).strict();

async function loginUser(request: Request) {
  const ipLimit = await enforceAuthRateLimit(request, "login");
  if (ipLimit) return ipLimit;

  let body: Record<string, unknown> | null;
  try {
    body = await readJsonLimited(request, 8192);
  } catch {
    return json({ error: "Ukuran permintaan login maksimal 8 KB." }, 413);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Masukkan username/email dan password yang valid." }, 422);

  const { identity, password } = parsed.data;
  const identityLimit = await enforceAuthRateLimit(request, "login", identity);
  if (identityLimit) return identityLimit;

  const users = await queryRows<(User & { password: string } & RowDataPacket)[]>(
    "SELECT id, username, email, password, full_name, profile_photo, role FROM users WHERE username = ? OR email = ? LIMIT 1",
    [identity, identity],
  );

  const account = users[0];
  if (!account || !(await bcrypt.compare(password, account.password))) {
    return json({ error: "Username/email atau password salah." }, 422);
  }

  const user = {
    id: Number(account.id),
    username: String(account.username),
    email: String(account.email),
    full_name: String(account.full_name ?? ""),
    profile_photo: String(account.profile_photo ?? ""),
    role: account.role as User["role"],
  };

  const persistent = parsed.data.remember === true;
  const token = await createSession(user.id, persistent);
  const response = json({ success: true, user });
  response.headers.append("Set-Cookie", cookieHeader(token, persistent));
  return response;
}

export async function POST(request: Request) {
  try {
    return await loginUser(request);
  } catch (error) {
    console.error("Login API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}