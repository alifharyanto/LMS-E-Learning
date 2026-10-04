import { getRequestUser, type User } from "@/lib/auth";
import { execute } from "@/lib/db";
import { json, parseId, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request, role?: User["role"]) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (role && user.role !== role) return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const threadId = parseId(id);
    const body = await readJson(request);
    const message = safeString(body?.comment, 5000);
    if (!threadId || !message) return json({ error: "Thread dan komentar wajib diisi." }, 422);

    const result = await execute("INSERT INTO forum_comments (thread_id, user_id, author, message) VALUES (?, ?, ?, ?)", [threadId, guard.user.id, guard.user.username, message]);
    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Forum comment create error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}