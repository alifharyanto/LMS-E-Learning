import { getRequestUser, type User } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
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
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;
    await execute("INSERT INTO study_sessions (user_id, page_name, minutes_spent) VALUES (?, 'courses', 1)", [guard.user.id]);
    const materials = await queryRows<any[]>(
      "SELECT id, title, description, category, file_path, file_size, file_type, created_at FROM materials ORDER BY created_at DESC",
    );
    return json({ materials });
  } catch (error) {
    console.error("Courses API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}