import { get, put } from "@vercel/blob";
import { getRequestUser } from "@/lib/auth";
import { json, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const workspacePath = (userId: number) => `code-workspaces/${userId}/workspace.json`;
const maxFileBytes = 1024 * 1024;
const maxWorkspaceBytes = 20 * 1024 * 1024;
const maxFiles = 50;
const maxFolders = 100;

type WorkspaceFile = { name: string; content: string };

function validPath(path: string) {
  return path.length <= 160 && path.split("/").every((segment) => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,79}$/.test(segment) && !segment.includes(".."));
}

function validateFiles(value: unknown): { files: WorkspaceFile[]; size: number } | null {
  if (!Array.isArray(value) || value.length > maxFiles) return null;

  const files: WorkspaceFile[] = [];
  const names = new Set<string>();
  let size = 0;

  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry as Record<string, unknown>;
    const name = candidate.name;
    const content = candidate.content;
    if (typeof name !== "string" || typeof content !== "string") return null;
    if (!validPath(name)) return null;

    const normalizedName = name.toLowerCase();
    if (names.has(normalizedName)) return null;
    names.add(normalizedName);

    const fileSize = new TextEncoder().encode(content).byteLength;
    if (fileSize > maxFileBytes) return null;
    size += fileSize;
    if (size > maxWorkspaceBytes) return null;
    files.push({ name, content });
  }

  return { files, size };
}

function validateFolders(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > maxFolders) return null;
  const folders = new Set<string>();
  const normalizedFolders = new Set<string>();
  for (const folder of value) {
    if (typeof folder !== "string" || !validPath(folder)) return null;
    if (folder.split("/").some((segment) => segment.includes("."))) return null;
    const normalized = folder.toLowerCase();
    if (normalizedFolders.has(normalized)) return null;
    normalizedFolders.add(normalized);
    folders.add(folder);
  }
  return Array.from(folders);
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk untuk menyinkronkan workspace." }, 401);

  try {
    const blob = await get(workspacePath(user.id), { access: "private", useCache: false });
    if (!blob) return json({ files: [], folders: [], size: 0 });

    const saved = await new Response(blob.stream).json() as { files?: unknown; folders?: unknown };
    const workspace = validateFiles(saved.files);
    const folders = validateFolders(saved.folders ?? []);
    if (!workspace || !folders) return json({ error: "Data workspace tersimpan tidak valid." }, 500);
    return json({ ...workspace, folders });
  } catch {
    return json({ error: "Workspace cloud tidak dapat dimuat." }, 503);
  }
}

export async function PUT(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk untuk menyinkronkan workspace." }, 401);

  const body = await readJson(request);
  const workspace = validateFiles(body?.files);
  const folders = validateFolders(body?.folders ?? []);
  if (!workspace || !folders) {
    return json({ error: "File, extension, atau ukuran workspace tidak valid. Batasnya 1 MB per file dan 20 MB per akun." }, 422);
  }

  try {
    await put(workspacePath(user.id), JSON.stringify({ files: workspace.files, folders }), {
      access: "private",
      allowOverwrite: true,
      cacheControlMaxAge: 60,
      contentType: "application/json; charset=utf-8",
    });
    return json({ saved: true, size: workspace.size });
  } catch {
    return json({ error: "Workspace belum tersimpan. Pastikan Blob cloud sudah dikonfigurasi." }, 503);
  }
}