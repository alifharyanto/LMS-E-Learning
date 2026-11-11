import { getRequestUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
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

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    const name = safeString(body?.category_name, 150);
    const materialCategory = safeString(body?.material_category, 100);
    const description = safeString(body?.description, 10_000);
    const timeLimit = Number(body?.time_limit_minutes);
    const questionType = String(body?.question_type ?? "pilihan").toLowerCase() === "essay" ? "essay" : "pilihan";
    if (!name || !Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 1440) {
      return json({ error: "Judul quiz dan durasi 1-1440 menit wajib diisi." }, 422);
    }
    if (body?.material_category && !materialCategory) return json({ error: "Kategori materi tidak valid." }, 422);
    if (materialCategory) {
      const categories = await queryRows<RowDataPacket[]>("SELECT category FROM materials WHERE category = ? LIMIT 1", [materialCategory]);
      if (!categories.length) return json({ error: "Pilih kategori yang tersedia pada Materi Belajar." }, 422);
    }

    const result = await execute("INSERT INTO quiz_categories (name, parent_id, material_category, description, time_limit_minutes, question_type) VALUES (?, NULL, ?, ?, ?, ?)", [name, materialCategory || null, description || null, timeLimit, questionType]);
    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Admin category create error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}