import { getRequestUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, parseId, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const materialId = parseId(id);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);

    const body = await readJson(request);
    const title = safeString(body?.title, 255);
    const description = safeString(body?.description, 10_000);
    const category = safeString(body?.category, 100);
    const fileType = body?.file_type;
    if (!title || !category) return json({ error: "Judul dan kategori wajib diisi." }, 422);

    const current = await queryRows<any[]>("SELECT id, file_type FROM materials WHERE id = ? LIMIT 1", [materialId]);
    if (!current.length) return json({ error: "Materi tidak ditemukan." }, 404);

    const filePath = safeString(body?.file_path, 2000);
    if (filePath) {
      let uploadedFile: URL;
      try {
        uploadedFile = new URL(filePath);
      } catch {
        return json({ error: "URL file pengganti tidak valid." }, 422);
      }
      const fileSize = Number(body?.file_size);
      const validType = fileType === "application/pdf" || fileType === "text/markdown";
      const expectedExtension = fileType === "text/markdown" ? ".md" : ".pdf";
      const maximumSize = fileType === "text/markdown" ? 5 * 1024 * 1024 : 25 * 1024 * 1024;
      if (!validType || !uploadedFile.pathname.toLowerCase().endsWith(expectedExtension) || uploadedFile.protocol !== "https:" || !uploadedFile.hostname.endsWith(".blob.vercel-storage.com") || !uploadedFile.pathname.startsWith(`/materials/${guard.user.id}/`) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > maximumSize) {
        return json({ error: "File pengganti harus PDF atau Markdown milik admin ini dan sesuai batas ukuran." }, 422);
      }
      await execute("UPDATE materials SET title = ?, description = ?, category = ?, file_path = ?, file_size = ?, file_type = ? WHERE id = ?", [title, description, category, uploadedFile.toString(), fileSize, fileType, materialId]);
    } else {
      if (fileType && fileType !== current[0].file_type) return json({ error: "Pilih file baru saat mengganti format materi." }, 422);
      await execute("UPDATE materials SET title = ?, description = ?, category = ? WHERE id = ?", [title, description, category, materialId]);
    }
    return json({ success: true });
  } catch (error) {
    console.error("Admin material update error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const materialId = parseId(id);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);

    await execute("DELETE FROM materials WHERE id = ?", [materialId]);
    return json({ success: true });
  } catch (error) {
    console.error("Admin material delete error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}