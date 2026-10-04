import { getRequestUser } from "@/lib/auth";
import { execute, queryRows } from "@/lib/db";
import { json, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function profileUpdate(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
  if (user.role !== "student") return json({ error: "Akses tidak diizinkan." }, 403);

  const body = request.headers.get("content-type")?.includes("application/json") ? await readJson(request) : null;
  const form = body ? null : await request.formData();
  const fullName = safeString(body?.full_name ?? form?.get("full_name"), 150);
  const email = safeString(body?.email ?? form?.get("email"), 150).toLowerCase();

  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Nama lengkap dan email valid wajib diisi." }, 422);
  }

  const duplicate = await queryRows<any[]>("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1", [email, user.id]);
  if (duplicate.length) return json({ error: "Email sudah digunakan." }, 409);

  let photo = user.profile_photo;
  const photoUrl = safeString(body?.profile_photo_url, 2000);
  const upload = form?.get("profile_photo");

  if (photoUrl) {
    let parsedPhoto: URL;
    try {
      parsedPhoto = new URL(photoUrl);
    } catch {
      return json({ error: "URL foto tidak valid." }, 422);
    }
    if (parsedPhoto.protocol !== "https:" || !parsedPhoto.hostname.endsWith(".blob.vercel-storage.com") || !parsedPhoto.pathname.startsWith(`/profiles/${user.id}/`)) {
      return json({ error: "Foto profil harus berasal dari upload akun ini." }, 422);
    }
    photo = parsedPhoto.toString();
  } else if (upload instanceof File && upload.size > 0) {
    return json({ error: "Upload foto melalui endpoint Blob diperlukan." }, 422);
  }

  await execute("UPDATE users SET full_name = ?, email = ?, profile_photo = ? WHERE id = ?", [fullName, email, photo, user.id]);
  return json({ success: true, user: { ...user, full_name: fullName, email, profile_photo: photo } });
}

export async function PATCH(request: Request) {
  try {
    return await profileUpdate(request);
  } catch (error) {
    console.error("Profile update API error:", error);
    return json({ error: "Permintaan gagal diproses." }, 500);
  }
}