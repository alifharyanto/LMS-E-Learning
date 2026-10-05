import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const categoryId = parseId(id);
    if (!categoryId) return json({ error: "Kategori tidak ditemukan." }, 404);

    const body = await readJson(request);
    const rawTimeLimit = body?.time_limit_minutes;
    const timeLimit = rawTimeLimit === "" || rawTimeLimit === null || rawTimeLimit === undefined ? null : Number(rawTimeLimit);
    if (timeLimit !== null && (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 1440)) {
      return json({ error: "Durasi harus antara 1-1440 menit atau dikosongkan." }, 422);
    }

    const categories = await queryRows<(RowDataPacket & { id: number })[]>("SELECT id FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    if (!categories[0]) return json({ error: "Kategori tidak ditemukan." }, 404);
    await execute("UPDATE quiz_categories SET time_limit_minutes = ? WHERE id = ?", [timeLimit, categoryId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin category update error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const categoryId = parseId(id);
    if (!categoryId) return json({ error: "Kategori tidak ditemukan." }, 404);

    await execute("DELETE FROM quiz_categories WHERE id = ?", [categoryId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin category delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}