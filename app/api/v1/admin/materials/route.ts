import { getRequestUser } from "@/lib/auth";
import { execute } from "@/lib/db";
import { json, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function POST(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJson(request);
    const title = safeString(body?.title, 255);
    const description = safeString(body?.description, 10_000);
    const category = safeString(body?.category, 100);
    const filePath = safeString(body?.file_path, 2000);
    const fileType = body?.file_type;
    const fileSize = Number(body?.file_size);
    const maximumSize = fileType === "text/markdown" ? 5 * 1024 * 1024 : 25 * 1024 * 1024;

    let uploadedFile: URL;
    try {
      uploadedFile = new URL(filePath);
    } catch {
      return json({ error: "Upload file belum selesai atau URL tidak valid." }, 422);
    }

    const validType = fileType === "application/pdf" || fileType === "text/markdown";
    const expectedExtension = fileType === "text/markdown" ? ".md" : ".pdf";
    if (!title || !category || !validType || !uploadedFile.pathname.toLowerCase().endsWith(expectedExtension) || uploadedFile.protocol !== "https:" || !uploadedFile.hostname.endsWith(".blob.vercel-storage.com") || !uploadedFile.pathname.startsWith(`/materials/${guard.user.id}/`) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > maximumSize) {
      return json({ error: "Judul, kategori, file PDF/Markdown valid, dan ukuran sesuai batas wajib diisi." }, 422);
    }

    const result = await execute("INSERT INTO materials (title, description, category, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?, ?)", [title, description, category, uploadedFile.toString(), fileSize, fileType]);
    return json({ success: true, id: result.insertId }, 201);
  } catch (error) {
    console.error("Admin material create error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}