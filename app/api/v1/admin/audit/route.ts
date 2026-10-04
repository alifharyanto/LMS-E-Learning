import { getRequestUser, type User } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function GET(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const logs = await queryRows<any[]>(
      "SELECT l.id, l.action, l.entity_type, l.entity_id, l.details, l.created_at, u.username AS actor_username FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.actor_user_id ORDER BY l.created_at DESC LIMIT 100",
    );

    return json({ logs });
  } catch (error) {
    console.error("Admin audit API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}
