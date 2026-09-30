import "server-only";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getRequestUser } from "@/lib/auth";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getRequestUser(request);
        if (!user) throw new Error("Silakan masuk terlebih dahulu.");

        let purpose: unknown;
        try {
          purpose = (JSON.parse(clientPayload ?? "{}") as Record<string, unknown>).purpose;
        } catch {
          throw new Error("Tujuan upload tidak valid.");
        }

        const isMaterial = purpose === "material" && user.role === "admin";
        const isProfile = purpose === "profile" && user.role === "student";
        if (!isMaterial && !isProfile) throw new Error("Akses upload tidak diizinkan.");

        const prefix = isMaterial ? `materials/${user.id}/` : `profiles/${user.id}/`;
        const filename = pathname.slice(prefix.length);
        if (!pathname.startsWith(prefix) || !filename || filename.includes("/") || filename.includes("..")) {
          throw new Error("Nama file upload tidak valid.");
        }

        return {
          allowedContentTypes: isMaterial ? ["application/pdf"] : ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: isMaterial ? 25 * 1024 * 1024 : 2 * 1024 * 1024,
          addRandomSuffix: true,
          validUntil: Date.now() + 60 * 60 * 1000,
          tokenPayload: JSON.stringify({ userId: user.id, purpose }),
        };
      },
    });

    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Upload gagal." }, 400);
  }
}