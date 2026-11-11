  import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
    if (user.role !== "admin") return json({ error: "Akses tidak diizinkan." }, 403);

    const { id } = await params;
    const categoryId = parseId(id);
    if (!categoryId) return json({ error: "Quiz tidak ditemukan." }, 404);

    const started = await transaction(async (connection) => {
      const [categories] = await connection.execute<(RowDataPacket & {
        id: number;
        countdown_enabled: number;
        countdown_seconds: number;
        quiz_starts_at: Date | string | null;
        starts_in_seconds: number | null;
      })[]>(
        "SELECT id, countdown_enabled, countdown_seconds, quiz_starts_at, CASE WHEN quiz_starts_at IS NULL THEN NULL ELSE GREATEST(CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(3), quiz_starts_at) / 1000000), 0) END AS starts_in_seconds FROM quiz_categories WHERE id = ? LIMIT 1 FOR UPDATE",
        [categoryId],
      );
      const category = categories[0];
      if (!category) return { error: "Quiz tidak ditemukan.", status: 404 as const };
      if (category.quiz_starts_at && Number(category.starts_in_seconds) > 0) {
        return { starts_in_seconds: Number(category.starts_in_seconds) };
      }

      const [questionCount] = await connection.execute<(RowDataPacket & { total: number })[]>(
        "SELECT COUNT(*) AS total FROM quiz_questions WHERE category_id = ?",
        [categoryId],
      );
      if (Number(questionCount[0]?.total) === 0) return { error: "Tambahkan soal sebelum memulai quiz.", status: 422 as const };

      const [activeAttempts] = await connection.execute<(RowDataPacket & { id: number })[]>(
        "SELECT id FROM quiz_attempts WHERE category_id = ? AND status = 'in_progress' AND expires_at > UTC_TIMESTAMP() LIMIT 1",
        [categoryId],
      );
      if (activeAttempts.length) return { error: "Quiz masih dikerjakan siswa. Tunggu sampai attempt aktif selesai.", status: 409 as const };

      const seconds = Number(category.countdown_enabled) ? Number(category.countdown_seconds) : 5;
      if (!Number.isInteger(seconds) || seconds < 1 || seconds > 300) {
        return { error: "Pengaturan countdown tidak valid. Simpan konfigurasi quiz terlebih dahulu.", status: 422 as const };
      }

      await connection.execute(
        "UPDATE quiz_categories SET quiz_starts_at = TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP()) WHERE id = ?",
        [seconds, categoryId],
      );
      return { starts_in_seconds: seconds };
    });

    if ("error" in started) return json({ error: started.error }, started.status);
    return json({ starts_in_seconds: started.starts_in_seconds });
  } catch (error) {
    console.error("Admin quiz start error:", error);
    return json({ error: "Quiz gagal dimulai." }, 500);
  }
}
