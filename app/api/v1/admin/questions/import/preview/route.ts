import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";
import { parseQuizImport, type QuizImportError } from "@/lib/quiz-import";
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
    const errors: QuizImportError[] = [...parsed.errors];
    const rows = parsed.rows.filter((row) => {
      if (!categoryMap.has(row.category.toLocaleLowerCase("id-ID"))) {
        errors.push({ rowNumber: row.rowNumber, message: `Kategori \"${row.category}\" tidak ditemukan.` });
        return false;
      }
      return true;
    });
    return json({ totalRows: parsed.totalRows, validRows: rows.length, errors, rows: rows.slice(0, 20) });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "File import tidak dapat dibaca." }, 422);
  }
}