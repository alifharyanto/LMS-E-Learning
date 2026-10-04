import bcrypt from "bcryptjs";
import { getRequestUser, type User } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

function textField(data: Record<string, unknown>, field: string, maxLength = 5000) {
  return safeString(data[field], maxLength);
}

export async function GET(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const accounts = await queryRows<any[]>(
      "SELECT id, username, email, full_name, profile_photo, role, account_status, last_active_at, created_at FROM users ORDER BY created_at DESC",
    );
    return json({ accounts });
  } catch (error) {
    console.error("Admin accounts list error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    const username = textField(body ?? {}, "username", 100);
    const email = textField(body ?? {}, "email", 150).toLowerCase();
    const fullName = textField(body ?? {}, "full_name", 150);
    const password = safeString(body?.password, 256);
    const role = String(body?.role ?? "student");

    if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || !["student", "admin"].includes(role)) {
      return json({ error: "Username, email, password, dan role wajib valid." }, 422);
    }

    const existing = await queryRows<any[]>("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1", [username, email]);
    if (existing.length) return json({ error: "Username atau email sudah digunakan." }, 409);

    const result = await execute(
      "INSERT INTO users (username, email, password, full_name, profile_photo, role, account_status) VALUES (?, ?, ?, ?, '', ?, 'active')",
      [username, email, await bcrypt.hash(password, 12), fullName, role],
    );

    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Admin create account error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
