import type { RowDataPacket } from "mysql2/promise";
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
    const questionType = String(body?.question_type ?? "pilihan").toLowerCase() === "essay" ? "essay" : "pilihan";
    const name = body?.category_name === undefined ? null : safeString(body.category_name, 150);
    const materialCategory = body?.material_category === undefined ? undefined : safeString(body.material_category, 100);
    const description = body?.description === undefined ? undefined : safeString(body.description, 10_000);
    if (timeLimit !== null && (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 1440)) {
      return json({ error: "Durasi harus antara 1-1440 menit atau dikosongkan." }, 422);
    }
    if (name !== null && !name) return json({ error: "Judul quiz wajib diisi." }, 422);
    if (body?.material_category && !materialCategory) return json({ error: "Kategori materi tidak valid." }, 422);

    const categories = await queryRows<(RowDataPacket & { id: number; name: string; material_category: string | null; description: string | null; time_limit_minutes: number | null })[]>("SELECT id, name, material_category, description, time_limit_minutes FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    const category = categories[0];
    if (!category) return json({ error: "Quiz tidak ditemukan." }, 404);
    const nextMaterialCategory = materialCategory === undefined ? category.material_category : materialCategory || null;
    const normalizeCategory = (value: string | null | undefined) => value?.trim().toLocaleLowerCase("id-ID") ?? "";
    const isExistingCategory = normalizeCategory(nextMaterialCategory) === normalizeCategory(category.material_category)
      || (!category.material_category && normalizeCategory(nextMaterialCategory) === normalizeCategory(category.name));
    if (nextMaterialCategory && !isExistingCategory) {
      const materialCategories = await queryRows<RowDataPacket[]>("SELECT category FROM materials WHERE LOWER(TRIM(category)) = LOWER(TRIM(?)) LIMIT 1", [nextMaterialCategory]);
      if (!materialCategories.length) return json({ error: "Pilih kategori yang tersedia pada Materi Belajar." }, 422);
    }
    await execute(
      "UPDATE quiz_categories SET name = ?, material_category = ?, description = ?, time_limit_minutes = ?, question_type = ? WHERE id = ?",
      [name ?? category.name, nextMaterialCategory, description === undefined ? category.description : description || null, timeLimit, questionType, categoryId],
    );
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