import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readMaterialMarkdown(filePath: string) {
  let content: Buffer;
  if (filePath.startsWith("https://")) {
    const remote = new URL(filePath);
    if (!remote.hostname.endsWith(".blob.vercel-storage.com")) throw new Error("Sumber Markdown tidak diizinkan.");
    const response = await fetch(remote, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error("File Markdown tidak dapat diunduh.");
    if (Number(response.headers.get("content-length") ?? 0) > 5 * 1024 * 1024) throw new Error("Ukuran Markdown melebihi batas 5 MB.");
    content = Buffer.from(await response.arrayBuffer());
  } else {
    const relativePath = filePath.replace(/^\/+/, "");
    if (!relativePath.startsWith("Materi/") || relativePath.split("/").some((part) => part === "..")) throw new Error("Path Markdown tidak valid.");
    content = await readFile(join(process.cwd(), "public", relativePath));
  }
  if (content.length > 5 * 1024 * 1024) throw new Error("Ukuran Markdown melebihi batas 5 MB.");
  return content.toString("utf8").replace(/^\uFEFF/, "");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);

    const { id } = await params;
    const materialId = parseId(id);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);

    const materials = await queryRows<any[]>("SELECT title, file_path, file_type FROM materials WHERE id = ? LIMIT 1", [materialId]);
    const material = materials[0];
    const filePath = String(material?.file_path ?? "");
    if (!material || !filePath) return json({ error: "File materi tidak tersedia." }, 404);

    if (material.file_type === "text/markdown") {
      const markdown = await readMaterialMarkdown(filePath);
      if (!markdown.trim()) return json({ error: "File Markdown kosong." }, 422);
      return json({ markdown, pages: 1 });
    }

    return json({ error: "Format file bukan markdown." }, 422);
  } catch (error) {
    console.error("Course markdown API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}