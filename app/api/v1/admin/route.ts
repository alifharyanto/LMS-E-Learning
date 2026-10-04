import { getRequestUser, type User } from "@/lib/auth";
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

    const [materials, contacts, categories, questions, results, studentCounts, registrations, activeToday, activeStudents, quizSummary] = await Promise.all([
      queryRows<any[]>("SELECT id, title, description, category, file_path, file_size, file_type, created_at FROM materials ORDER BY created_at DESC"),
      queryRows<any[]>("SELECT id, name, email, phone, subject, message, status, created_at FROM contacts ORDER BY created_at DESC"),
      queryRows<any[]>("SELECT c.id, c.name, COUNT(q.id) AS questions_count FROM quiz_categories c LEFT JOIN quiz_questions q ON q.category_id = c.id GROUP BY c.id, c.name ORDER BY c.name"),
      queryRows<any[]>("SELECT id, category_id, question, option_a, option_b, option_c, option_d, answer_index, explanation FROM quiz_questions ORDER BY created_at DESC"),
      queryRows<any[]>("SELECT r.id, r.user_id, r.score, r.total, r.percent, r.created_at, u.username FROM quiz_results r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC"),
      queryRows<any[]>("SELECT COUNT(*) AS total, COALESCE(SUM(created_at >= CURDATE()), 0) AS joined_today FROM users WHERE role = 'student'"),
      queryRows<any[]>("SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS total FROM users WHERE role = 'student' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)"),
      queryRows<any[]>("SELECT COUNT(DISTINCT user_id) AS total FROM study_sessions WHERE created_at >= CURDATE()"),
      queryRows<any[]>("SELECT u.id, u.username, u.full_name, MAX(s.created_at) AS last_active FROM study_sessions s INNER JOIN users u ON u.id = s.user_id WHERE u.role = 'student' AND s.created_at >= CURDATE() GROUP BY u.id, u.username, u.full_name ORDER BY last_active DESC LIMIT 6"),
      queryRows<any[]>("SELECT COUNT(*) AS attempts, COALESCE(ROUND(AVG(percent)), 0) AS average_percent, COALESCE(SUM(percent >= 70), 0) AS passed FROM quiz_results WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"),
    ]);

    return json({
      materials,
      contacts,
      categories,
      questions,
      results,
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