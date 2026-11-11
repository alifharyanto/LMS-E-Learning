import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";
import { getMaterialRichHtml, isMaterialRichHtml } from "@/lib/material-rich-content";

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

    const materials = await queryRows<(RowDataPacket & { title: string; file_path: string | null; file_type: string | null; content: string | null })[]>("SELECT title, file_path, file_type, content FROM materials WHERE id = ? LIMIT 1", [materialId]);
    const material = materials[0];
    const filePath = String(material?.file_path ?? "");
    if (!material) return json({ error: "Materi tidak ditemukan." }, 404);

    if (material.file_type === "text/markdown") {
      if (typeof material.content === "string") {
        if (Buffer.byteLength(material.content, "utf8") > 5 * 1024 * 1024) return json({ error: "Ukuran Markdown melebihi batas 5 MB." }, 422);
        if (!material.content.trim()) return json({ error: "Materi Markdown kosong." }, 422);
        if (isMaterialRichHtml(material.content)) {
          return json({ html: getMaterialRichHtml(material.content), pages: 1 });
        }
        return json({ markdown: material.content, pages: 1 });
      }
      if (!filePath) return json({ error: "File materi tidak tersedia." }, 404);
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