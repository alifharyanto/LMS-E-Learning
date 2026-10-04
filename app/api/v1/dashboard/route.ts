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
    const guard = await roleGuard(request, "student");
    if (guard.response) return guard.response;

    const [results, averages, threads, study] = await Promise.all([
      queryRows<any[]>("SELECT id, score, total, percent, created_at FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC", [guard.user.id]),
      queryRows<any[]>("SELECT COALESCE(ROUND(AVG(percent)), 0) AS average FROM quiz_results WHERE user_id = ?", [guard.user.id]),
      queryRows<any[]>("SELECT COUNT(*) AS total FROM forum_threads WHERE user_id = ?", [guard.user.id]),
      queryRows<any[]>("SELECT COALESCE(SUM(minutes_spent), 0) AS minutes FROM study_sessions WHERE user_id = ?", [guard.user.id]),
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