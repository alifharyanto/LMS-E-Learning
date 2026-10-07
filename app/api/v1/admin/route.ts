import { getRequestUser, type User } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";

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

    const [materials, contacts, categories, questions, results, studentCounts, registrations, activeToday, activeStudents, quizSummary] = await Promise.all([
      queryRows<RowDataPacket[]>("SELECT id, title, description, category, file_path, file_size, file_type, created_at FROM materials ORDER BY created_at DESC"),
      queryRows<RowDataPacket[]>("SELECT id, name, email, phone, subject, message, status, created_at FROM contacts ORDER BY created_at DESC"),
      queryRows<RowDataPacket[]>("SELECT c.id, c.name, c.time_limit_minutes, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id GROUP BY c.id, c.name, c.time_limit_minutes ORDER BY c.name"),
      queryRows<RowDataPacket[]>("SELECT id, category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY created_at DESC"),
      queryRows<RowDataPacket[]>("SELECT r.id, r.user_id, r.score, r.total, r.percent, r.correct_answers, r.created_at, a.started_at, a.submitted_at, a.time_limit_minutes, a.status, a.questions_snapshot, a.answers, u.username, u.full_name FROM quiz_results r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN quiz_attempts a ON a.result_id = r.id AND a.status IN ('submitted', 'expired') ORDER BY r.created_at DESC"),
      queryRows<RowDataPacket[]>("SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= CURDATE()), 0) AS joined_today FROM users WHERE role = 'student'"),
      queryRows<RowDataPacket[]>("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS total FROM users WHERE role = 'student' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)"),
      queryRows<RowDataPacket[]>("SELECT COUNT(DISTINCT user_id) AS total FROM study_sessions WHERE created_at >= CURDATE()"),
      queryRows<RowDataPacket[]>("SELECT u.id, u.username, u.full_name, MAX(s.created_at) AS last_active FROM study_sessions s INNER JOIN users u ON u.id = s.user_id WHERE u.role = 'student' AND s.created_at >= CURDATE() GROUP BY u.id, u.username, u.full_name ORDER BY last_active DESC LIMIT 6"),
      queryRows<RowDataPacket[]>("SELECT COUNT(*) AS attempts, COALESCE(ROUND(AVG(percent)), 0) AS average_percent, COALESCE(SUM(percent >= 70), 0) AS passed FROM quiz_results WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"),
    ]);

    const resultRows = results.map((row) => {
      const snapshot = parseJson<SnapshotQuestion[]>(row.questions_snapshot, []);
      const answers = parseJson<Record<string, number>>(row.answers, {});
      const startedAt = row.started_at ? new Date(String(row.started_at)).getTime() : null;
      const submittedAt = row.submitted_at ? new Date(String(row.submitted_at)).getTime() : null;
      const completedAt = submittedAt ?? new Date(String(row.created_at)).getTime();
      const durationSeconds = startedAt && completedAt ? Math.max(0, Math.floor((completedAt - startedAt) / 1000)) : 0;
      return {
        id: Number(row.id),
        user_id: Number(row.user_id),
        username: row.username ?? null,
        full_name: row.full_name ?? null,
        score: Number(row.score),
        total: Number(row.total),
        correct_answers: Number(row.correct_answers ?? row.score),
        incorrect_answers: Math.max(0, Number(row.total) - Number(row.correct_answers ?? row.score)),
        percent: Number(row.percent),
        status: row.status ?? "submitted",
        started_at: row.started_at,
        submitted_at: row.submitted_at,
        created_at: row.created_at,
        duration_seconds: durationSeconds,
        questions: snapshot.map((question) => ({
          id: Number(question.id),
          question: question.question,
          option_a: question.option_a,
          option_b: question.option_b,
          option_c: question.option_c,
          option_d: question.option_d,
          answer_index: Number(question.answer_index),
          selected_index: answers[String(question.id)] ?? null,
          is_correct: Number(answers[String(question.id)] ?? -1) === Number(question.answer_index),
        })),
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