import type { RowDataPacket } from "mysql2";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession, type User } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, readJsonLimited } from "@/lib/http";
import { enforceAuthRateLimit } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieHeader(token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `courseup_session=${token}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

const registerSchema = z.object({
  username: z.string().trim().min(1).max(100),
  email: z.email().max(150).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(256),
  password_confirmation: z.string().min(8).max(256),
  terms: z.literal(true),
}).strict().refine((data) => data.password === data.password_confirmation, {
  path: ["password_confirmation"],
});

export async function POST(request: Request) {
  try {
    const ipLimit = await enforceAuthRateLimit(request, "register");
    if (ipLimit) return ipLimit;

    let body: Record<string, unknown> | null;
    try {
      body = await readJsonLimited(request, 8192);
    } catch {
      return json({ error: "Ukuran permintaan registrasi maksimal 8 KB." }, 413);
    }
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) return json({ error: "Data registrasi tidak valid. Periksa username, email, password, dan persetujuan." }, 422);

    const { username, email, password } = parsed.data;

    const existing = await queryRows<(RowDataPacket & { id: number })[]>(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, email],
    );
    if (existing.length) return json({ error: "Username atau email sudah digunakan." }, 409);

    const result = await execute(
      "INSERT INTO users (username, email, password, full_name, profile_photo, role) VALUES (?, ?, ?, '', '', 'student')",
      [username, email, await bcrypt.hash(password, 12)],
    );

    const user: User = { id: result.insertId, username, email, full_name: "", profile_photo: "", role: "student" };
    const token = await createSession(user.id, false);
    const response = json({ success: true, user }, 201);
    response.headers.append("Set-Cookie", cookieHeader(token));
    return response;
  } catch (error) {
    console.error("Register API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}