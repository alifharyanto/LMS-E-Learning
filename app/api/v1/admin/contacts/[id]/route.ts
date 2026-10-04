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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const contactId = parseId(id);
    if (!contactId) return json({ error: "Kontak tidak ditemukan." }, 404);

    await execute("UPDATE contacts SET status = 'read' WHERE id = ?", [contactId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin contact read error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const contactId = parseId(id);
    if (!contactId) return json({ error: "Kontak tidak ditemukan." }, 404);

    await execute("DELETE FROM contacts WHERE id = ?", [contactId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin contact delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}