import { getRequestUser, type User } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request, role?: User["role"]) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (role && user.role !== role) return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const threadId = parseId(id);
    if (!threadId) return json({ error: "Thread tidak ditemukan." }, 404);

    const threads = await queryRows<any[]>("SELECT user_id FROM forum_threads WHERE id = ? LIMIT 1", [threadId]);
    if (!threads[0]) return json({ error: "Thread tidak ditemukan." }, 404);
    if (guard.user.role !== "admin" && Number(threads[0].user_id) !== guard.user.id) return json({ error: "Akses tidak diizinkan." }, 403);

    await execute("DELETE FROM forum_threads WHERE id = ?", [threadId]);
    return json({ success: true });
  } catch (error) {
    console.error("Forum thread delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}