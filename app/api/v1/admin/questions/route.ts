import { getRequestUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { json, parseId, readJson, safeString } from "@/lib/http";

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
    const categoryId = parseId(String(body?.category_id ?? ""));
    const question = safeString(body?.question, 10_000);
    const options = ["option_a", "option_b", "option_c", "option_d"].map((field) => safeString(body?.[field], 255));
    const answerIndex = Number(body?.answer_index);
    if (!categoryId || !question || options.some((option) => !option) || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      return json({ error: "Lengkapi kategori, pertanyaan, empat opsi, dan jawaban benar." }, 422);
    }

    const result = await execute("INSERT INTO quiz_questions (category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [categoryId, question, ...options, answerIndex, safeString(body?.explanation, 10_000)]);

    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Admin question create error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}