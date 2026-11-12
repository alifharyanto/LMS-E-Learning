import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { getRequestUser, type User } from "@/lib/auth";
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

type AccountRecord = RowDataPacket & { id: number; role: User["role"]; account_status: "active" | "suspended" };

async function findAccount(identifier: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)) {
    const accounts = await queryRows<AccountRecord[]>(
      "SELECT id, role, account_status FROM users WHERE account_uuid = ? LIMIT 1",
      [identifier],
    );
    return accounts[0] ?? null;
  }

  const numericId = parseId(identifier);
  if (!numericId) return null;
  const accounts = await queryRows<AccountRecord[]>(
    "SELECT id, role, account_status FROM users WHERE id = ? LIMIT 1",
    [numericId],
  );
  return accounts[0] ?? null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return json({ error: "Akun tidak ditemukan." }, 404);
    }

    const accounts = await queryRows<(User & RowDataPacket & {
      uuid: string;
      account_status: "active" | "suspended";
      last_active_at: string | null;
      created_at: string;
    })[]>(
      "SELECT id, account_uuid AS uuid, username, email, full_name, profile_photo, role, account_status, last_active_at, created_at FROM users WHERE account_uuid = ? LIMIT 1",
      [id],
    );
    if (!accounts[0]) return json({ error: "Akun tidak ditemukan." }, 404);
    return json({ account: accounts[0] });
  } catch (error) {
    console.error("Admin account detail error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const account = await findAccount(id);
    if (!account) return json({ error: "Akun tidak ditemukan." }, 404);

    const body = await readJson(request);
    const username = textField(body ?? {}, "username", 100);
    const email = textField(body ?? {}, "email", 150).toLowerCase();
    const fullName = textField(body ?? {}, "full_name", 150);
    const role = String(body?.role ?? "student");
    const accountStatus = String(body?.account_status ?? "active");
    const rawPassword = typeof body?.password === "string" ? body.password : "";
    const password = safeString(body?.password, 256);
    const photo = safeString(body?.profile_photo_url, 2000);

    if (!username || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["student", "admin"].includes(role) || !["active", "suspended"].includes(accountStatus) || rawPassword.length > 256 || (password.length > 0 && password.length < 8)) {
      return json({ error: "Data akun tidak valid." }, 422);
    }

    if (guard.user.id === account.id && accountStatus === "suspended") {
      return json({ error: "Anda tidak dapat menonaktifkan akun yang sedang digunakan." }, 422);
    }
    if (guard.user.id === account.id && role !== account.role) {
      return json({ error: "Anda tidak dapat mengubah role akun yang sedang digunakan." }, 422);
    }

    const duplicate = await queryRows<(RowDataPacket & { id: number })[]>("SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ? LIMIT 1", [username, email, account.id]);
    if (duplicate.length) return json({ error: "Username atau email sudah digunakan." }, 409);

    const updates: string[] = ["username = ?", "email = ?", "full_name = ?", "role = ?", "account_status = ?"];
    const values: (string | number | null)[] = [username, email, fullName, role, accountStatus];
    if (typeof body?.profile_photo_url === "string") {
      updates.push("profile_photo = ?");
      values.push(photo);
    }

    if (password) {
      updates.push("password = ?");
      values.push(await bcrypt.hash(password, 12));
    }
    if (password || accountStatus !== account.account_status || role !== account.role) {
      updates.push("session_version = session_version + 1");
    }

    values.push(account.id);
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
    const account = await findAccount(id);
    if (!account) return json({ error: "Akun tidak ditemukan." }, 404);
    if (guard.user.id === account.id) return json({ error: "Anda tidak dapat menghapus akun yang sedang digunakan." }, 422);

    await execute("DELETE FROM users WHERE id = ?", [account.id]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin delete account error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
