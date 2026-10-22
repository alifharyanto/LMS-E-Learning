import { getRequestUser } from "@/lib/auth";
import { queryRows, transaction } from "@/lib/db";
import { json } from "@/lib/http";
import { parseQuizImport } from "@/lib/quiz-import";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CategoryRow = RowDataPacket & { id: number; name: string; question_type: string | null };

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
  if (user.role !== "admin") return json({ error: "Akses tidak diizinkan." }, 403);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return json({ error: "Pilih file CSV, JSON, atau XLSX." }, 422);

  try {
    const parsed = await parseQuizImport(file);
    const categories = await queryRows<CategoryRow[]>("SELECT id, name, question_type FROM quiz_categories");
    const categoryMap = new Map(categories.map((category) => [category.name.trim().toLocaleLowerCase("id-ID"), { id: category.id, questionType: category.question_type ?? "pilihan" }]));
    const categoryErrors = parsed.category
      ? []
      : parsed.rows.flatMap((row) => {
        const categoryLookup = categoryMap.get(row.category.toLocaleLowerCase("id-ID"));
        return categoryLookup ? [] : [{ rowNumber: row.rowNumber, message: `Kategori \"${row.category}\" tidak ditemukan.` }];
      });
    const errors = [...parsed.errors, ...categoryErrors];
    if (errors.length) return json({ error: "Import dibatalkan karena ada data yang tidak valid.", totalRows: parsed.totalRows, validRows: parsed.rows.length - categoryErrors.length, errors }, 422);

    await transaction(async (connection) => {
      let importedCategoryId: number | null = null;
      if (parsed.category) {
        const existingCategory = categoryMap.get(parsed.category.name.toLocaleLowerCase("id-ID"));
        importedCategoryId = existingCategory?.id ?? null;
        if (importedCategoryId) {
          await connection.execute("UPDATE quiz_categories SET time_limit_minutes = ?, question_type = ? WHERE id = ?", [parsed.category.timeLimitMinutes, parsed.category.questionType, importedCategoryId]);
        } else {
          const [result] = await connection.execute<ResultSetHeader>(
            "INSERT INTO quiz_categories (name, parent_id, time_limit_minutes, question_type) VALUES (?, NULL, ?, ?)",
            [parsed.category.name, parsed.category.timeLimitMinutes, parsed.category.questionType],
          );
          importedCategoryId = result.insertId;
        }
      }

      for (const row of parsed.rows) {
        const categoryId = importedCategoryId ?? categoryMap.get(row.category.toLocaleLowerCase("id-ID"))?.id;
        if (!categoryId) throw new Error(`Kategori "${row.category}" tidak ditemukan.`);
        const questionType = row.question_type ?? "pilihan";
        await connection.execute(
          "INSERT INTO quiz_questions (category_id, question_type, question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [categoryId, questionType, row.question, questionType === "essay" ? null : row.option_a, questionType === "essay" ? null : row.option_b, questionType === "essay" ? null : row.option_c, questionType === "essay" ? null : row.option_d, questionType === "essay" ? null : row.answer_index, row.explanation],
        );
      }
    });

    return json({ success: true, imported: parsed.rows.length }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Import gagal diproses." }, 422);
  }
}