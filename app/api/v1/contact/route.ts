import { execute, queryRows, transaction } from "@/lib/db";
import { json, readJson, safeString } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function textField(data: Record<string, unknown>, field: string, maxLength = 5000) {
  return safeString(data[field], maxLength);
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const name = textField(body ?? {}, "name", 150);
    const email = textField(body ?? {}, "email", 150).toLowerCase();
    const phone = textField(body ?? {}, "phone", 20);
    const subject = textField(body ?? {}, "subject", 255);
    const message = textField(body ?? {}, "message", 10_000);

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || !message) {
      return json({ success: false, message: "Lengkapi nama, email, subjek, dan pesan dengan benar." }, 422);
    }

    const attempts = await queryRows<any[]>("SELECT COUNT(*) AS total FROM contact_attempts WHERE email = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)", [email]);
    if (Number(attempts[0]?.total ?? 0) >= 3) {
      return json({ success: false, message: "Anda terlalu sering mengirim pesan. Coba lagi beberapa menit." }, 429);
    }

    await transaction(async (connection) => {
      await connection.execute("INSERT INTO contact_attempts (email) VALUES (?)", [email]);
      await connection.execute("INSERT INTO contacts (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, 'unread')", [name, email, phone || null, subject, message]);
    });

    return json({ success: true, message: "Kontak Anda berhasil dikirim! Admin akan segera membalas." }, 201);
  } catch (error) {
    console.error("Contact API error:", error);
    return json({ success: false, message: "Permintaan gagal diproses." }, 500);
  }
}