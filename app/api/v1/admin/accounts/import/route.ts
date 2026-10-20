import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { json, readJsonLimited } from "@/lib/http";
import { transaction } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportRecord = {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: "admin" | "student";
};

function generatedUsername(email: string) {
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  return localPart.replace(/[^a-z0-9._-]+/g, "-").replace(/^[._-]+|[._-]+$/g, "").slice(0, 100);
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
    if (user.role !== "admin") return json({ error: "Akses tidak diizinkan." }, 403);

    let body: Record<string, unknown> | null;
    try {
      body = await readJsonLimited(request, 512 * 1024);
    } catch (error) {
      if (error instanceof RangeError) return json({ error: "Ukuran file import maksimal 512 KB." }, 413);
      throw error;
    }
    if (!body || !Array.isArray(body.accounts) || body.accounts.length < 1 || body.accounts.length > 100) {
      return json({ error: "Data harus berisi 1 sampai 100 akun." }, 422);
    }

    const errors: string[] = [];
    const accounts: ImportRecord[] = [];
    const seenEmails = new Set<string>();
    const seenUsernames = new Set<string>();

    body.accounts.forEach((value, index) => {
      const rowNumber = index + 1;
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        errors.push(`Baris ${rowNumber}: data akun harus berbentuk object.`);
        return;
      }

      const fields = value as Record<string, unknown>;
      const fullName = typeof fields["nama-lengkap"] === "string" ? fields["nama-lengkap"].trim() : "";
      const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
      const password = typeof fields.password === "string" ? fields.password : "";
      const roleValue = typeof fields.role === "string" ? fields.role.trim().toLowerCase() : "";
      const username = generatedUsername(email);
      const rowErrors: string[] = [];

      if (!fullName || fullName.length > 150) rowErrors.push("nama-lengkap wajib diisi (maksimal 150 karakter)");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150) rowErrors.push("email tidak valid");
      if (password.length < 8 || password.length > 256) rowErrors.push("password harus berisi 8 sampai 256 karakter");
      if (roleValue !== "admin" && roleValue !== "student") rowErrors.push("role harus student atau admin");
      if (!username) rowErrors.push("username tidak dapat dibuat dari bagian email sebelum @");
      if (email && seenEmails.has(email)) rowErrors.push("email duplikat di dalam file");
      if (username && seenUsernames.has(username)) rowErrors.push("username otomatis duplikat di dalam file");

      if (email) seenEmails.add(email);
      if (username) seenUsernames.add(username);
      if (rowErrors.length) {
        errors.push(`Baris ${rowNumber}: ${rowErrors.join(", ")}.`);
        return;
      }

      accounts.push({
        username,
        email,
        fullName,
        password,
        role: roleValue as ImportRecord["role"],
      });
    });

    if (errors.length) return json({ error: errors.join(" ") }, 422);

    const passwordHashes = await Promise.all(accounts.map(({ password }) => bcrypt.hash(password, 12)));
    await transaction(async (connection) => {
      const placeholders = accounts.map(() => "?").join(", ");
      const values = [
        ...accounts.map(({ email }) => email),
        ...accounts.map(({ username }) => username),
      ];
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT username, email FROM users WHERE email IN (${accounts.map(() => "?").join(", ")}) OR username IN (${placeholders})`,
        values,
      );
      if (existing.length) {
        throw new Error("Email atau username otomatis dari bagian email sebelum @ sudah digunakan. Tidak ada akun yang diimport.");
      }

      for (const [index, account] of accounts.entries()) {
        await connection.execute(
          "INSERT INTO users (username, email, password, full_name, profile_photo, role, account_status) VALUES (?, ?, ?, ?, '', ?, 'active')",
          [account.username, account.email, passwordHashes[index], account.fullName, account.role],
        );
      }
    });

    return json({ success: true, imported: accounts.length }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Email atau username otomatis")) {
      return json({ error: error.message }, 409);
    }
    if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") {
      return json({ error: "Ada email atau username yang baru saja digunakan. Tidak ada akun yang diimport." }, 409);
    }
    console.error("Admin import accounts error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
