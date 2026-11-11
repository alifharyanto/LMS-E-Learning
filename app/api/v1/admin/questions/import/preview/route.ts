import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";
import { findQuizImportCategory, parseQuizImport, type QuizImportError } from "@/lib/quiz-import";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CategoryRow = RowDataPacket & { id: number; name: string; material_category: string | null; question_type: string | null };

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
  if (user.role !== "admin") return json({ error: "Akses tidak diizinkan." }, 403);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return json({ error: "Pilih file CSV, JSON, atau XLSX." }, 422);

  try {
    const parsed = await parseQuizImport(file);
    const categories = await queryRows<CategoryRow[]>("SELECT id, name, material_category, question_type FROM quiz_categories");
    const materialCategories = await queryRows<(RowDataPacket & { category: string })[]>("SELECT DISTINCT category FROM materials WHERE TRIM(category) <> ''");
    const errors: QuizImportError[] = [...parsed.errors];
    if (parsed.category?.materialCategory && !materialCategories.some((category) => category.category.toLocaleLowerCase("id-ID") === parsed.category?.materialCategory.toLocaleLowerCase("id-ID"))) {
      errors.push({ rowNumber: 1, message: `Kategori Materi Belajar "${parsed.category.materialCategory}" tidak ditemukan.` });
    }
    if (parsed.category && !parsed.category.materialCategory && categories.filter((category) => category.name.trim().toLocaleLowerCase("id-ID") === parsed.category?.name.toLocaleLowerCase("id-ID")).length > 1) {
      errors.push({ rowNumber: 1, message: `Judul quiz "${parsed.category.name}" ada di beberapa kategori. Isi material_category pada konfigurasi JSON.` });
    }
    const rows = parsed.rows.filter((row) => {
      const categoryLookup = parsed.category ? { id: 0, question_type: parsed.category.questionType } : findQuizImportCategory(categories, row.category, row.material_category);
      if (!categoryLookup) {
        errors.push({ rowNumber: row.rowNumber, message: `Quiz \"${row.category}\" tidak ditemukan atau memiliki judul yang sama pada beberapa kategori. Isi kolom material_category bila diperlukan.` });
        return false;
      }
      if (categoryLookup.question_type === "essay" && row.question_type !== "essay") {
        errors.push({ rowNumber: row.rowNumber, message: `Quiz \"${row.category}\" diatur sebagai essay, tetapi soal ini bukan jenis essay.` });
        return false;
      }
      return true;
    });
    return json({ totalRows: parsed.totalRows, validRows: rows.length, errors, rows: rows.slice(0, 20) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "File import tidak dapat dibaca." }, 422);
  }
}