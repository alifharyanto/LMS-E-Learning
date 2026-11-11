import { getRequestUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const questionId = parseId(id);
    if (!questionId) return json({ error: "Soal tidak ditemukan." }, 404);

    await execute("DELETE FROM quiz_questions WHERE id = ?", [questionId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin question delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const questionId = parseId(id);
    if (!questionId) return json({ error: "Soal tidak ditemukan." }, 404);

    const body = await readJson(request);
    const question = safeString(body?.question, 10_000);
    const questionType = body?.question_type === "essay" ? "essay" : "pilihan";
    const options = ["option_a", "option_b", "option_c", "option_d"].map((field) => safeString(body?.[field], 255));
    const answerIndex = body?.answer_index === null ? null : Number(body?.answer_index);
    if (!question || typeof body?.explanation !== "string" || body.explanation.length > 10_000) {
      return json({ error: "Pertanyaan dan alasan wajib valid." }, 422);
    }
    if (questionType === "pilihan" && (options.some((option) => !option) || !Number.isInteger(answerIndex) || answerIndex === null || answerIndex < 0 || answerIndex > 3)) {
      return json({ error: "Lengkapi empat opsi dan jawaban benar." }, 422);
    }
    const questions = await queryRows<(RowDataPacket & { id: number; category_id: number })[]>(
      "SELECT id, category_id FROM quiz_questions WHERE id = ? LIMIT 1",
      [questionId],
    );
    if (!questions[0]) return json({ error: "Soal tidak ditemukan." }, 404);

    await execute(
      "UPDATE quiz_questions SET question_type = ?, question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, answer_index = ?, explanation = ? WHERE id = ?",
      [questionType, question, questionType === "essay" ? null : options[0], questionType === "essay" ? null : options[1], questionType === "essay" ? null : options[2], questionType === "essay" ? null : options[3], questionType === "essay" ? null : answerIndex, safeString(body.explanation, 10_000), questionId],
    );
    return json({ success: true });
  } catch (error) {
    console.error("Admin question explanation update error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}