import { getRequestUser, type User } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";
import type { RowDataPacket } from "mysql2/promise";

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
    const guard = await roleGuard(request, "student");
    if (guard.response) return guard.response;

    const [results, averages, threads, study] = await Promise.all([
      queryRows<RowDataPacket[]>("SELECT r.id, r.score, r.total, r.percent, r.unanswered_answers, c.name AS category_name, c.question_type, r.essay_review_submitted, r.created_at, CASE WHEN c.question_type = 'essay' AND r.essay_review_submitted = 0 THEN 0 WHEN c.question_type = 'essay' THEN COALESCE(grading.essay_correct, 0) ELSE COALESCE(r.correct_answers, r.score) END AS correct_answers, CASE WHEN c.question_type = 'essay' AND r.essay_review_submitted = 0 THEN 0 WHEN c.question_type = 'essay' THEN COALESCE(grading.essay_incorrect, 0) ELSE GREATEST(r.total - COALESCE(r.correct_answers, r.score) - r.unanswered_answers, 0) END AS incorrect_answers, CASE WHEN c.question_type = 'essay' AND r.essay_review_submitted = 0 THEN GREATEST(r.total - r.unanswered_answers, 0) WHEN c.question_type = 'essay' THEN GREATEST(r.total - r.unanswered_answers - COALESCE(grading.essay_correct, 0) - COALESCE(grading.essay_incorrect, 0), 0) ELSE 0 END AS pending_answers, CASE WHEN COALESCE(c.question_type, 'pilihan') <> 'essay' OR (r.essay_review_submitted = 1 AND GREATEST(r.total - r.unanswered_answers - COALESCE(grading.essay_correct, 0) - COALESCE(grading.essay_incorrect, 0), 0) = 0) THEN 1 ELSE 0 END AS is_graded FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id LEFT JOIN (SELECT result_id, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS essay_correct, SUM(CASE WHEN selected_index IS NULL AND is_correct = 0 THEN 1 ELSE 0 END) AS essay_incorrect FROM quiz_question_attempts GROUP BY result_id) grading ON grading.result_id = r.id WHERE r.user_id = ? ORDER BY r.created_at DESC", [guard.user.id]),
      queryRows<RowDataPacket[]>("SELECT COALESCE(ROUND(AVG(r.percent)), 0) AS average FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.user_id = ? AND (COALESCE(c.question_type, 'pilihan') <> 'essay' OR r.essay_review_submitted = 1)", [guard.user.id]),
      queryRows<RowDataPacket[]>("SELECT COUNT(*) AS total FROM forum_threads WHERE user_id = ?", [guard.user.id]),
      queryRows<RowDataPacket[]>("SELECT COALESCE(SUM(minutes_spent), 0) AS minutes FROM study_sessions WHERE user_id = ?", [guard.user.id]),
    ]);

    return json({
      user: guard.user,
      results,
      average: Number(averages[0]?.average ?? 0),
      threads: Number(threads[0]?.total ?? 0),
      minutes: Number(study[0]?.minutes ?? 0),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}