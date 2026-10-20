import { getRequestUser } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { json, readJsonLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RESULT_IDS = 10_000;
const DELETE_BATCH_SIZE = 500;

async function roleGuard(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return { response: json({ error: "Silakan masuk terlebih dahulu." }, 401) };
  if (user.role !== "admin") return { response: json({ error: "Akses tidak diizinkan." }, 403) };
  return { user };
}

export async function DELETE(request: Request) {
  try {
    const guard = await roleGuard(request);
    if (guard.response) return guard.response;

    const body = await readJsonLimited(request, 256 * 1024);
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > MAX_RESULT_IDS) {
      return json({ error: `Pilih antara 1 sampai ${MAX_RESULT_IDS} hasil belajar.` }, 422);
    }
    if (!body.ids.every((id) => typeof id === "number" && Number.isSafeInteger(id) && id > 0)) {
      return json({ error: "Daftar hasil belajar tidak valid." }, 422);
    }

    const resultIds = Array.from(new Set(body.ids as number[]));
    if (resultIds.length !== body.ids.length) {
      return json({ error: "Daftar hasil belajar berisi ID duplikat." }, 422);
    }

    const deleted = await transaction(async (connection) => {
      let deletedCount = 0;
      for (let offset = 0; offset < resultIds.length; offset += DELETE_BATCH_SIZE) {
        const batch = resultIds.slice(offset, offset + DELETE_BATCH_SIZE);
        const placeholders = batch.map(() => "?").join(", ");
        await connection.execute(`DELETE FROM quiz_question_attempts WHERE result_id IN (${placeholders})`, batch);
        await connection.execute(`DELETE FROM quiz_attempts WHERE result_id IN (${placeholders})`, batch);
        const [deleteResult] = await connection.execute(
          `DELETE FROM quiz_results WHERE id IN (${placeholders})`,
          batch,
        );
        deletedCount += (deleteResult as { affectedRows: number }).affectedRows;
      }
      return deletedCount;
    });

    return json({ success: true, deleted });
  } catch (error) {
    if (error instanceof RangeError) return json({ error: "Permintaan terlalu besar." }, 413);
    console.error("Admin bulk result delete error:", error);
    return json({ error: "Hasil belajar yang dipilih gagal dihapus." }, 500);
  }
}
