import { getRequestUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const resultId = parseId(id);
    if (!resultId) return json({ error: "Hasil quiz tidak ditemukan." }, 404);

    await execute("DELETE FROM quiz_results WHERE id = ?", [resultId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin result delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}