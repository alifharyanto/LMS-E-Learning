import { getRequestUser } from "@/lib/auth";
import { queryRows, transaction } from "@/lib/db";
import { json } from "@/lib/http";
import { parseQuizImport } from "@/lib/quiz-import";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CategoryRow = RowDataPacket & { id: number; name: string };

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
  if (user.role !== "admin") return json({ error: "Akses tidak diizinkan." }, 403);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return json({ error: "Pilih file CSV, JSON, atau XLSX." }, 422);

  try {
    const parsed = await parseQuizImport(file);
    const categories = await queryRows<CategoryRow[]>("SELECT id, name FROM quiz_categories");
    const categoryMap = new Map(categories.map((category) => [category.name.trim().toLocaleLowerCase("id-ID"), category.id]));
    const categoryErrors = parsed.rows.flatMap((row) => categoryMap.has(row.category.toLocaleLowerCase("id-ID")) ? [] : [{ rowNumber: row.rowNumber, message: `Kategori \"${row.category}\" tidak ditemukan.` }]);
    const errors = [...parsed.errors, ...categoryErrors];
    if (errors.length) return json({ error: "Import dibatalkan karena ada data yang tidak valid.", totalRows: parsed.totalRows, validRows: parsed.rows.length - categoryErrors.length, errors }, 422);

    await transaction(async (connection) => {
      for (const row of parsed.rows) {
        const categoryId = categoryMap.get(row.category.toLocaleLowerCase("id-ID"));
        if (!categoryId) throw new Error(`Kategori "${row.category}" tidak ditemukan.`);
        await connection.execute(
          "INSERT INTO quiz_questions (category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [categoryId, row.question, row.option_a, row.option_b, row.option_c, row.option_d, row.answer_index, row.explanation],
        );
      }
    });

    return json({ success: true, imported: parsed.rows.length }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Import gagal diproses." }, 422);
  }
}