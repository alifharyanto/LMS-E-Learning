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
    if (typeof body?.explanation !== "string" || body.explanation.length > 10_000) {
      return json({ error: "Penjelasan wajib berupa teks maksimal 10.000 karakter." }, 422);
    }

    const questions = await queryRows<(RowDataPacket & { id: number })[]>(
      "SELECT id FROM quiz_questions WHERE id = ? LIMIT 1",
      [questionId],
    );
    if (!questions[0]) return json({ error: "Soal tidak ditemukan." }, 404);

    await execute(
      "UPDATE quiz_questions SET explanation = ? WHERE id = ?",
      [safeString(body.explanation, 10_000), questionId],
    );
    return json({ success: true });
  } catch (error) {
    console.error("Admin question explanation update error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}