import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json, parseId } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);

    const { id } = await params;
    const materialId = parseId(id);
    if (!materialId) return json({ error: "Materi tidak ditemukan." }, 404);

    const materials = await queryRows<any[]>("SELECT file_path FROM materials WHERE id = ? LIMIT 1", [materialId]);
    const filePath = String(materials[0]?.file_path ?? "");
    if (!filePath) return json({ error: "File materi tidak tersedia." }, 404);

    if (filePath.startsWith("https://")) return Response.redirect(filePath, 302);

    const relativePath = filePath.replace(/^\/+/, "");
    if (!relativePath.startsWith("Materi/") || relativePath.includes("..")) return json({ error: "File materi tidak tersedia." }, 404);

    const url = new URL(request.url);
    return Response.redirect(new URL(`/${relativePath.split("/").map(encodeURIComponent).join("/")}`, url.origin), 302);
  } catch (error) {
    console.error("Course file API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}