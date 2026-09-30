import { getRequestUser } from "@/lib/auth";
import { json, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFileBytes = 1024 * 1024;
const maxWorkspaceBytes = 20 * 1024 * 1024;
const maxRunnerResponseBytes = 2 * 1024 * 1024;
const supportedExtensions = new Set(["php", "html", "htm", "css", "js", "mjs", "cjs", "json"]);

function validFiles(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) return null;
  const files: { name: string; content: string }[] = [];
  const names = new Set<string>();
  let size = 0;

  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.name !== "string" || typeof candidate.content !== "string") return null;
    if (candidate.name.length > 160 || candidate.name.split("/").some((segment) => !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,79}$/.test(segment) || segment.includes(".."))) return null;
    const extension = candidate.name.split("/").at(-1)?.split(".").at(-1)?.toLowerCase();
    if (!extension || !supportedExtensions.has(extension)) return null;
    const normalizedName = candidate.name.toLowerCase();
    if (names.has(normalizedName)) return null;
    names.add(normalizedName);
    const fileSize = new TextEncoder().encode(candidate.content).byteLength;
    if (fileSize > maxFileBytes) return null;
    size += fileSize;
    if (size > maxWorkspaceBytes) return null;
    files.push({ name: candidate.name, content: candidate.content });
  }

  return files;
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk untuk menjalankan PHP." }, 401);

  const runnerUrl = process.env.PHP_RUNNER_URL;
  if (!runnerUrl) return json({ error: "Runner PHP belum dikonfigurasi untuk project ini." }, 503);

  let target: URL;
  try {
    target = new URL(runnerUrl);
  } catch {
    return json({ error: "Konfigurasi runner PHP tidak valid." }, 503);
  }
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(target.hostname);
  if (target.protocol !== "https:" && !localDevelopment) {
    return json({ error: "Runner PHP harus menggunakan HTTPS." }, 503);
  }

  const body = await readJson(request);
  const files = validFiles(body?.files);
  const entryFile = typeof body?.entryFile === "string" ? body.entryFile : "index.php";
  if (!files || !files.some((file) => file.name === entryFile && file.name.toLowerCase().endsWith(".php"))) {
    return json({ error: "File PHP utama tidak valid atau ukuran project melewati batas." }, 422);
  }

  try {
    const response = await fetch(target, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        ...(process.env.PHP_RUNNER_TOKEN ? { Authorization: `Bearer ${process.env.PHP_RUNNER_TOKEN}` } : {}),
      },
      body: JSON.stringify({ files, entryFile, userId: user.id }),
    });
    const responseText = await response.text();
    if (new TextEncoder().encode(responseText).byteLength > maxRunnerResponseBytes) {
      return json({ error: "Output runner PHP melebihi batas 2 MB." }, 502);
    }
    if (!response.ok) return json({ error: `Runner PHP gagal (${response.status}).` }, 502);

    const result = JSON.parse(responseText) as Record<string, unknown>;
    if (typeof result.html !== "string" || typeof result.output !== "string") {
      return json({ error: "Format output runner PHP tidak valid." }, 502);
    }
    return json({ html: result.html, output: result.output });
  } catch {
    return json({ error: "Runner PHP tidak merespons atau mengembalikan output yang tidak valid." }, 502);
  }
}