import { getRequestUser, type User } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
import { execute, queryRows } from "@/lib/db";
import { json, parseId, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request, role?: User["role"]) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (role && user.role !== role) return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function GET(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const url = new URL(request.url);
    const categoryId = parseId(url.searchParams.get("category_id") ?? "");
    if (!categoryId) {
      const categories = await queryRows<RowDataPacket[]>("SELECT c.id, c.name, c.time_limit_minutes, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id WHERE c.parent_id IS NULL GROUP BY c.id, c.name, c.time_limit_minutes ORDER BY c.name");
      return json({ categories });
    }

    const categories = await queryRows<RowDataPacket[]>("SELECT id, name, time_limit_minutes FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    if (!categories[0]) return json({ error: "Kategori quiz tidak ditemukan." }, 404);

    const questions = await queryRows<RowDataPacket[]>("SELECT id, question, option_a, option_b, option_c, option_d FROM quiz_questions WHERE category_id = ? ORDER BY id", [categoryId]);
    return json({ category: categories[0], questions });
  } catch (error) {
    console.error("Quiz list API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    const categoryId = parseId(String(body?.category_id ?? ""));
    const answers = body?.answers;
    if (!categoryId || !answers || typeof answers !== "object" || Array.isArray(answers)) {
      return json({ error: "Jawaban quiz tidak valid." }, 422);
    }

    const categories = await queryRows<RowDataPacket[]>("SELECT time_limit_minutes FROM quiz_categories WHERE id = ? LIMIT 1", [categoryId]);
    if (Number(categories[0]?.time_limit_minutes) > 0) {
      return json({ error: "Quiz bertimer harus dikirim melalui attempt quiz." }, 409);
    }

    const questions = await queryRows<RowDataPacket[]>("SELECT id, answer_index, explanation FROM quiz_questions WHERE category_id = ? ORDER BY id", [categoryId]);
    if (!questions.length) return json({ error: "Kategori ini belum memiliki soal." }, 422);
    if (questions.some((question) => !Object.hasOwn(answers, String(question.id)))) {
      return json({ error: "Jawab semua pertanyaan sebelum mengirim quiz." }, 422);
    }

    const score = questions.reduce((total, question) => {
      return total + (Number((answers as Record<string, unknown>)[String(question.id)]) === Number(question.answer_index) ? 1 : 0);
    }, 0);
    const total = questions.length;
    const percent = Math.floor((score / total) * 100);
    const result = await execute("INSERT INTO quiz_results (user_id, category_id, score, total, percent, correct_answers) VALUES (?, ?, ?, ?, ?, ?)", [guard.user.id, categoryId, score, total, percent, score]);

    return json({ success: true, result: { id: result.insertId, score, total, percent, explanations: questions.map((question) => ({ id: question.id, text: question.explanation })) } }, 201);
  } catch (error) {
    console.error("Quiz submit API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}