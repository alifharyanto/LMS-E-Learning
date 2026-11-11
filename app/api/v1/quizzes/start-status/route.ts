import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);

    const categoryId = parseId(new URL(request.url).searchParams.get("category_id") ?? "");
    if (!categoryId) return json({ error: "Kategori quiz tidak valid." }, 422);

    const rows = await queryRows<(RowDataPacket & {
      quiz_starts_at: Date | string | null;
      starts_in_seconds: number | null;
      started: number;
    })[]>(
      "SELECT quiz_starts_at, CASE WHEN quiz_starts_at IS NULL THEN NULL ELSE GREATEST(CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(3), quiz_starts_at) / 1000000), 0) END AS starts_in_seconds, (quiz_starts_at IS NOT NULL AND quiz_starts_at <= UTC_TIMESTAMP()) AS started FROM quiz_categories WHERE id = ? LIMIT 1",
      [categoryId],
    );
    if (!rows[0]) return json({ error: "Quiz tidak ditemukan." }, 404);
    return json({
      scheduled: rows[0].quiz_starts_at !== null,
      started: Boolean(rows[0].started),
      starts_in_seconds: rows[0].starts_in_seconds === null ? null : Number(rows[0].starts_in_seconds),
    });
  } catch (error) {
    console.error("Quiz start status API error:", error);
    return json({ error: "Status mulai quiz gagal dimuat." }, 500);
  }
}
