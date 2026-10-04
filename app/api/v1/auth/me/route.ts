import { getRequestUser, type User } from "@/lib/auth";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authMe(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
  return json({ user });
}

export async function GET(request: Request) {
  try {
    return await authMe(request);
  } catch (error) {
    console.error("Auth me error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}