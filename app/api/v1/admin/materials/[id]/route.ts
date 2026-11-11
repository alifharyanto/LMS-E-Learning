import { getRequestUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2/promise";
import { execute, queryRows } from "@/lib/db";
import { json, parseId, readJson, safeString } from "@/lib/http";
import { toYouTubeEmbedUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const { id } = await params;
    const materialId = parseId(id);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);

    const materials = await queryRows<RowDataPacket[]>("SELECT id, title, description, category, file_path, file_size, file_type, content, youtube_embed_url FROM materials WHERE id = ? LIMIT 1", [materialId]);
    if (!materials.length) return json({ error: "Materi tidak ditemukan." }, 404);
    return json({ material: materials[0] });
  } catch (error) {
    console.error("Admin material detail error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
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
    const materialSource = body?.material_source;
    if (!title || !category) return json({ error: "Judul dan kategori wajib diisi." }, 422);

    const current = await queryRows<(RowDataPacket & { id: number; file_type: string; content: string | null; youtube_embed_url: string | null })[]>("SELECT id, file_type, content, youtube_embed_url FROM materials WHERE id = ? LIMIT 1", [materialId]);
    if (!current.length) return json({ error: "Materi tidak ditemukan." }, 404);

    const youtubeUrl = body?.youtube_url === undefined ? undefined : safeString(body.youtube_url, 2000);
    const youtubeEmbedUrl = youtubeUrl === undefined
      ? current[0].youtube_embed_url
      : youtubeUrl ? toYouTubeEmbedUrl(youtubeUrl) : null;
    if (youtubeUrl && !youtubeEmbedUrl) return json({ error: "Masukkan URL video YouTube yang valid." }, 422);

    if (materialSource === "editor") {
      const content = body?.content;
      if (fileType !== "text/markdown" || typeof content !== "string" || !content.trim()) {
        return json({ error: "Isi materi Markdown wajib diisi." }, 422);
      }
      const contentSize = Buffer.byteLength(content, "utf8");
      if (contentSize > 5 * 1024 * 1024) return json({ error: "Isi materi Markdown maksimal 5 MB." }, 422);
      await execute("UPDATE materials SET title = ?, description = ?, category = ?, file_path = '', file_size = ?, file_type = 'text/markdown', content = ?, youtube_embed_url = ? WHERE id = ?", [title, description, category, contentSize, content, youtubeEmbedUrl, materialId]);
      return json({ success: true });
    }

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
      await execute("UPDATE materials SET title = ?, description = ?, category = ?, file_path = ?, file_size = ?, file_type = ?, content = NULL, youtube_embed_url = ? WHERE id = ?", [title, description, category, uploadedFile.toString(), fileSize, fileType, youtubeEmbedUrl, materialId]);
    } else {
      if (fileType && fileType !== current[0].file_type) return json({ error: "Pilih file baru saat mengganti format materi." }, 422);
      if (current[0].content !== null) return json({ error: "Unggah file pengganti atau pilih format Editor teks." }, 422);
      await execute("UPDATE materials SET title = ?, description = ?, category = ?, youtube_embed_url = ? WHERE id = ?", [title, description, category, youtubeEmbedUrl, materialId]);
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