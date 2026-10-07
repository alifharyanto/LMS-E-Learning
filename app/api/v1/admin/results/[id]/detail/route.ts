import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotQuestion = {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer_index: number;
  explanation: string | null;
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const resultId = parseId(id);
    if (!resultId) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const rows = await queryRows<(RowDataPacket & {
      id: number;
      user_id: number;
      score: number;
      total: number;
      percent: number;
      correct_answers: number;
      created_at: string;
      started_at: string | null;
      submitted_at: string | null;
      questions_snapshot: unknown;
      answers: unknown;
      username: string | null;
      full_name: string | null;
    })[]>(
      "SELECT r.id, r.user_id, r.score, r.total, r.percent, r.correct_answers, r.created_at, a.started_at, a.submitted_at, a.questions_snapshot, a.answers, u.username, u.full_name FROM quiz_results r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN quiz_attempts a ON a.result_id = r.id WHERE r.id = ? LIMIT 1",
      [resultId],
    );
    const row = rows[0];
    if (!row) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    const snapshot = parseJson<SnapshotQuestion[]>(row.questions_snapshot, []);
    const answers = parseJson<Record<string, number>>(row.answers, {});
    const startedAt = row.started_at ? new Date(row.started_at).getTime() : null;
    const submittedAt = row.submitted_at ? new Date(row.submitted_at).getTime() : null;
    const completedAt = submittedAt ?? new Date(row.created_at).getTime();

    return json({
      result: {
        id: Number(row.id),
        user_id: Number(row.user_id),
        username: row.username ?? null,
        full_name: row.full_name ?? null,
        score: Number(row.score),
        total: Number(row.total),
        correct_answers: Number(row.correct_answers),
        incorrect_answers: Math.max(0, Number(row.total) - Number(row.correct_answers)),
        percent: Number(row.percent),
        started_at: row.started_at,
        submitted_at: row.submitted_at,
        duration_seconds: startedAt && completedAt ? Math.max(0, Math.floor((completedAt - startedAt) / 1000)) : 0,
      },
      questions: snapshot.map((question) => {
        const selectedIndex = answers[String(question.id)] ?? null;
        return {
          id: Number(question.id),
          question: question.question,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          answer_index: Number(question.answer_index),
          selected_index: selectedIndex,
          is_correct: selectedIndex !== null && Number(selectedIndex) === Number(question.answer_index),
        };
      }),
    });
  } catch (error) {
    console.error("Admin result detail error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
