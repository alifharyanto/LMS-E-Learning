import bcrypt from "bcryptjs";
import { getRequestUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, parseId, readJson, safeString } from "@/lib/http";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const accountId = parseId(id);
    if (!accountId) return json({ error: "Akun tidak ditemukan." }, 404);

    const body = await readJson(request);
    const username = textField(body ?? {}, "username", 100);
    const email = textField(body ?? {}, "email", 150).toLowerCase();
    const fullName = textField(body ?? {}, "full_name", 150);
    const role = String(body?.role ?? "student");
    const accountStatus = String(body?.account_status ?? "active");
    const password = safeString(body?.password, 256);
    const photo = safeString(body?.profile_photo_url, 2000);

    if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["student", "admin"].includes(role) || !["active", "suspended"].includes(accountStatus)) {
      return json({ error: "Data akun tidak valid." }, 422);
    }

    const duplicate = await queryRows<any[]>("SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ? LIMIT 1", [username, email, accountId]);
    if (duplicate.length) return json({ error: "Username atau email sudah digunakan." }, 409);

    const updates: string[] = ["username = ?", "email = ?", "full_name = ?", "role = ?", "account_status = ?", "profile_photo = ?"];
    const values: (string | number | null)[] = [username, email, fullName, role, accountStatus, photo || ""];

    if (password) {
      updates.push("password = ?");
      values.push(await bcrypt.hash(password, 12));
    }

    values.push(accountId);
    await execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    return json({ success: true });
  } catch (error) {
    console.error("Admin update account error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const accountId = parseId(id);
    if (!accountId) return json({ error: "Akun tidak ditemukan." }, 404);

    await execute("DELETE FROM users WHERE id = ?", [accountId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin delete account error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
