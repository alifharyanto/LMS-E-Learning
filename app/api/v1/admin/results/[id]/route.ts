import { getRequestUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { json, parseId } from "@/lib/http";
import type { RowDataPacket } from "mysql2/promise";

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
    const resultId = parseId(id);
    if (!resultId) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const deleted = await transaction(async (connection) => {
      const [resultRows] = await connection.execute<(RowDataPacket & { user_id: number; category_id: number })[]>(
        "SELECT user_id, category_id FROM quiz_results WHERE id = ? LIMIT 1",
        [resultId],
      );
      const resultRow = resultRows[0];
      if (!resultRow) return false;

      await connection.execute("DELETE FROM quiz_question_attempts WHERE result_id = ?", [resultId]);
      await connection.execute("DELETE FROM quiz_results WHERE id = ?", [resultId]);
      await connection.execute(
        "DELETE FROM quiz_attempts WHERE result_id = ? OR (user_id = ? AND category_id = ? AND status <> 'in_progress' AND (result_id IS NULL OR NOT EXISTS (SELECT 1 FROM quiz_results r WHERE r.id = quiz_attempts.result_id)))",
        [resultId, resultRow.user_id, resultRow.category_id],
      );
      return true;
    });
    if (!deleted) return json({ error: "Hasil quiz tidak ditemukan." }, 404);
    return json({ success: true });
  } catch (error) {
    console.error("Admin result delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}