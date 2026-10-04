import { getRequestUser, type User } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request, role?: User["role"]) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (role && user.role !== role) return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

function textField(data: Record<string, unknown>, field: string, maxLength = 5000) {
  return safeString(data[field], maxLength);
}

export async function GET() {
  try {
    const threads = await queryRows<any[]>(
      "SELECT t.id, t.user_id, t.author, t.title, t.message, t.created_at, COUNT(c.id) AS comment_count FROM forum_threads t LEFT JOIN forum_comments c ON c.thread_id = t.id GROUP BY t.id ORDER BY t.created_at DESC",
    );
    const comments = await queryRows<any[]>("SELECT id, thread_id, user_id, author, message, created_at FROM forum_comments ORDER BY created_at ASC");
    return json({
      threads: threads.map((thread) => ({
        ...thread,
        comments: comments.filter((comment) => Number(comment.thread_id) === Number(thread.id)),
      })),
    });
  } catch (error) {
    console.error("Forum list API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    const title = textField(body ?? {}, "title", 255);
    const message = textField(body ?? {}, "message", 10_000);
    if (!title || !message) return json({ error: "Judul dan pesan wajib diisi." }, 422);

    const result = await execute("INSERT INTO forum_threads (user_id, author, title, message) VALUES (?, ?, ?, ?)", [guard.user.id, guard.user.username, title, message]);
    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Forum create API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}