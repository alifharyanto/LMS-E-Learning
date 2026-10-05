import { getRequestUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { json, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    const name = safeString(body?.category_name, 150);
    const parentId = body?.parent_id ? Number(body.parent_id) : null;
    const timeLimit = Number(body?.time_limit_minutes);
    if (!name || !Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 1440) {
      return json({ error: "Nama kategori dan durasi 1-1440 menit wajib diisi." }, 422);
    }

    const result = await execute("INSERT INTO quiz_categories (name, parent_id, time_limit_minutes) VALUES (?, ?, ?)", [name, parentId, timeLimit]);
    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Admin category create error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}