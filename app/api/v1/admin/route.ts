import { getRequestUser, type User } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";

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
    const guard = await roleGuard(request, "admin");
    if (guard.response) return guard.response;

    const resultsDate = new URL(request.url).searchParams.get("results_date");
    if (resultsDate !== null) {
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(resultsDate) ? new Date(`${resultsDate}T00:00:00Z`) : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== resultsDate) {
        return json({ error: "Tanggal hasil belajar tidak valid." }, 422);
      }
    }

    const resultsQuery = queryRows<RowDataPacket[]>(
      `SELECT r.id, r.user_id, r.category_id, c.name AS category_name, c.question_type, r.score, r.total, r.percent, r.correct_answers, r.unanswered_answers, r.essay_review_submitted, r.created_at, DATE_FORMAT(COALESCE(a.submitted_at, r.created_at), '%Y-%m-%d') AS result_date, a.started_at, a.submitted_at, a.status, u.username, u.full_name, COALESCE(grading.essay_correct, 0) AS essay_correct, COALESCE(grading.essay_incorrect, 0) AS essay_incorrect FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id LEFT JOIN users u ON u.id = r.user_id LEFT JOIN quiz_attempts a ON a.result_id = r.id AND a.status IN ('submitted', 'expired') LEFT JOIN (SELECT result_id, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS essay_correct, SUM(CASE WHEN selected_index IS NULL AND is_correct = 0 THEN 1 ELSE 0 END) AS essay_incorrect FROM quiz_question_attempts GROUP BY result_id) grading ON grading.result_id = r.id ${resultsDate ? "WHERE DATE(COALESCE(a.submitted_at, r.created_at)) = ?" : ""} ORDER BY COALESCE(a.submitted_at, r.created_at) DESC, r.id DESC`,
      resultsDate ? [resultsDate] : [],
    );

    const [materials, contacts, categories, questions, results, studentCounts, registrations, activeToday, activeStudents, quizSummary] = await Promise.all([
      queryRows<RowDataPacket[]>("SELECT id, title, description, category, file_path, file_size, file_type, content IS NOT NULL AS is_editor_content, youtube_embed_url, created_at FROM materials ORDER BY created_at DESC"),
      queryRows<RowDataPacket[]>("SELECT id, name, email, phone, subject, message, status, created_at FROM contacts ORDER BY created_at DESC"),
      queryRows<RowDataPacket[]>("SELECT c.id, c.name, c.material_category, c.description, c.time_limit_minutes, c.question_type, c.countdown_enabled, c.countdown_seconds, c.quiz_starts_at, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id GROUP BY c.id, c.name, c.material_category, c.description, c.time_limit_minutes, c.question_type, c.countdown_enabled, c.countdown_seconds, c.quiz_starts_at ORDER BY c.material_category, c.name"),
      queryRows<RowDataPacket[]>("SELECT q.id, q.question, q.answer_index, q.explanation, q.question_type, q.category_id, c.name AS quiz_title, c.material_category FROM quiz_questions q INNER JOIN quiz_categories c ON c.id = q.category_id ORDER BY c.material_category, c.name, q.created_at DESC"),
      resultsQuery,
      queryRows<RowDataPacket[]>("SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= CURDATE()), 0) AS joined_today FROM users WHERE role = 'student'"),
      queryRows<RowDataPacket[]>("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS total FROM users WHERE role = 'student' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)"),
      queryRows<RowDataPacket[]>("SELECT COUNT(DISTINCT user_id) AS total FROM study_sessions WHERE created_at >= CURDATE()"),
      queryRows<RowDataPacket[]>("SELECT u.id, u.username, u.full_name, MAX(s.created_at) AS last_active FROM study_sessions s INNER JOIN users u ON u.id = s.user_id WHERE u.role = 'student' AND s.created_at >= CURDATE() GROUP BY u.id, u.username, u.full_name ORDER BY last_active DESC LIMIT 6"),
      queryRows<RowDataPacket[]>("SELECT COUNT(*) AS attempts, COALESCE(ROUND(AVG(CASE WHEN COALESCE(c.question_type, 'pilihan') <> 'essay' OR r.essay_review_submitted = 1 THEN r.percent END)), 0) AS average_percent, COALESCE(SUM(CASE WHEN (COALESCE(c.question_type, 'pilihan') <> 'essay' OR r.essay_review_submitted = 1) AND r.percent >= 70 THEN 1 ELSE 0 END), 0) AS passed FROM quiz_results r LEFT JOIN quiz_categories c ON c.id = r.category_id WHERE r.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"),
    ]);

    const resultRows = results.map((row) => {
      const unansweredAnswers = Number(row.unanswered_answers ?? 0);
      const isEssay = row.question_type === "essay";
      const essayReviewSubmitted = Number(row.essay_review_submitted) === 1;
      const correctAnswers = isEssay
        ? essayReviewSubmitted ? Number(row.essay_correct) : 0
        : Number(row.correct_answers ?? row.score);
      const incorrectAnswers = isEssay && !essayReviewSubmitted
        ? 0
        : isEssay
        ? Number(row.essay_incorrect)
        : Math.max(0, Number(row.total) - correctAnswers - unansweredAnswers);
      const pendingAnswers = isEssay
        ? essayReviewSubmitted
          ? Math.max(0, Number(row.total) - unansweredAnswers - correctAnswers - incorrectAnswers)
          : Math.max(0, Number(row.total) - unansweredAnswers)
        : 0;
      const isGraded = !isEssay || (essayReviewSubmitted && pendingAnswers === 0);
      const startedAt = row.started_at ? new Date(String(row.started_at)).getTime() : null;
      const submittedAt = row.submitted_at ? new Date(String(row.submitted_at)).getTime() : null;
      const completedAt = submittedAt ?? new Date(String(row.created_at)).getTime();
      const durationSeconds = startedAt && completedAt ? Math.max(0, Math.floor((completedAt - startedAt) / 1000)) : 0;
      return {
        id: Number(row.id),
        user_id: Number(row.user_id),
        category_id: Number(row.category_id),
        category_name: row.category_name ?? null,
        username: row.username ?? null,
        full_name: row.full_name ?? null,
        score: Number(row.score),
        total: Number(row.total),
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        unanswered_answers: unansweredAnswers,
        pending_answers: pendingAnswers,
        is_graded: isGraded,
        percent: Number(row.percent),
        status: row.status ?? "submitted",
        started_at: row.started_at,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        result_date: String(row.result_date),
        duration_seconds: durationSeconds,
      };
    });

    return json({
      materials,
      contacts,
      categories,
      questions,
      results: resultRows,
      overview: {
        total_students: Number(studentCounts[0]?.total ?? 0),
        joined_today: Number(studentCounts[0]?.joined_today ?? 0),
        active_today: Number(activeToday[0]?.total ?? 0),
        registrations,
        active_students: activeStudents,
        quiz_30d: {
          attempts: Number(quizSummary[0]?.attempts ?? 0),
          average_percent: Number(quizSummary[0]?.average_percent ?? 0),
          passed: Number(quizSummary[0]?.passed ?? 0),
        },
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}