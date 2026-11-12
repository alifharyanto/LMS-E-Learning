import "server-only";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getRequestUser } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return json({ error: "Upload belum dikonfigurasi. Tambahkan BLOB_READ_WRITE_TOKEN ke environment server." }, 503);
  }
  if (blobToken.startsWith("eyJ")) {
    return json({ error: "BLOB_READ_WRITE_TOKEN berisi token OIDC. Gunakan token Read-Write dari Blob store Vercel untuk upload browser." }, 503);
  }

  try {
    const body = await request.json() as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getRequestUser(request);
        if (!user) throw new Error("Silakan masuk terlebih dahulu.");

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(clientPayload ?? "{}") as Record<string, unknown>;
        } catch {
          throw new Error("Tujuan upload tidak valid.");
        }

        const purpose = payload.purpose;
        const isMaterial = purpose === "material" && user.role === "admin";
        const isProfile = purpose === "profile" && user.role === "student";
        const targetUserId = Number(payload.targetUserId);
        const isAdminProfile = purpose === "admin-profile" && user.role === "admin" && Number.isSafeInteger(targetUserId) && targetUserId > 0;
        if (!isMaterial && !isProfile && !isAdminProfile) throw new Error("Akses upload tidak diizinkan.");
        if (isAdminProfile) {
          const target = await queryRows<(import("mysql2").RowDataPacket & { id: number })[]>(
            "SELECT id FROM users WHERE id = ? LIMIT 1",
            [targetUserId],
          );
          if (!target[0]) throw new Error("Akun tujuan tidak ditemukan.");
        }

        const profileUserId = isAdminProfile ? targetUserId : user.id;
        const prefix = isMaterial ? `materials/${user.id}/` : `profiles/${profileUserId}/`;
        const filename = pathname.slice(prefix.length);
        if (!pathname.startsWith(prefix) || !filename || filename.includes("/") || filename.includes("..")) {
          throw new Error("Nama file upload tidak valid.");
        }
        const isMarkdown = isMaterial && filename.toLowerCase().endsWith(".md");
        if (isMaterial && !isMarkdown && !filename.toLowerCase().endsWith(".pdf")) throw new Error("File materi harus PDF atau Markdown .md.");

        return {
          allowedContentTypes: isMaterial ? isMarkdown ? ["text/markdown"] : ["application/pdf"] : ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: isMaterial ? isMarkdown ? 5 * 1024 * 1024 : 25 * 1024 * 1024 : 2 * 1024 * 1024,
          addRandomSuffix: true,
          validUntil: Date.now() + 60 * 60 * 1000,
          tokenPayload: JSON.stringify({ userId: user.id, targetUserId: isAdminProfile ? targetUserId : user.id, purpose }),
        };
      },
    });

    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Upload gagal." }, 400);
  }
}