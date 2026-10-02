import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getRequestUser } from "@/lib/auth";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StudentRecord = { no_absen: number; nama: string; jenis_kelamin: "L" | "P"; kelas: string };

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk terlebih dahulu." }, 401);
  if (user.role !== "admin") return json({ error: "Akses tidak diizinkan." }, 403);

  try {
    const source = await readFile(join(process.cwd(), "data", "siswa.json"), "utf8");
    const students = JSON.parse(source) as StudentRecord[];
    if (!Array.isArray(students)) return json({ error: "Format data siswa harus berupa array JSON." }, 500);
    return json({ students });
  } catch {
    return json({ error: "Data siswa gagal dibaca. Periksa file data/siswa.json." }, 500);
  }
}
