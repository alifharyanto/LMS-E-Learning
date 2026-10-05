import { getRequestUser } from "@/lib/auth";
import { json, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxFileBytes = 1024 * 1024;
const maxContextBytes = 48 * 1024;
const maxResponseBytes = 2 * 1024 * 1024;

type WorkspaceFile = { name: string; content: string };
type ModelOption = { id: string; label: string; provider: "groq" | "custom"; model: string };

function environmentList(value: string | undefined) {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
}

function getModels(): ModelOption[] {
  const groqModels = environmentList(process.env.GROQ_MODELS);
  const groqModel = process.env.GROQ_MODEL?.trim();
  const groqList = groqModels.length ? groqModels : groqModel ? [groqModel] : ["llama-3.3-70b-versatile"];
  const customModels = environmentList(process.env.AI_MODELS);
  const customModel = process.env.AI_MODEL?.trim();
  const customList = customModels.length ? customModels : customModel ? [customModel] : [];
  return [
    ...groqList.map((model) => ({ id: `groq:${model}`, label: `Groq · ${model}`, provider: "groq" as const, model })),
    ...(process.env.AI_API_URL && process.env.AI_API_KEY ? customList.map((model) => ({ id: `custom:${model}`, label: `Custom · ${model}`, provider: "custom" as const, model })) : []),
  ];
}

function validPath(path: string) {
  return path.length <= 160 && path.split("/").every((segment) => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,79}$/.test(segment) && !segment.includes(".."));
}

function validateFiles(value: unknown, activeFileName: string) {
  if (!Array.isArray(value) || value.length > 50) return null;
  const entries: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    entries.push(entry as Record<string, unknown>);
  }
  entries.sort((left, right) => Number(right.name === activeFileName) - Number(left.name === activeFileName));

  const files: WorkspaceFile[] = [];
  const names = new Set<string>();
  let contextSize = 0;
  for (const candidate of entries) {
    if (typeof candidate.name !== "string" || typeof candidate.content !== "string" || !validPath(candidate.name)) return null;
    const normalized = candidate.name.toLowerCase();
    if (names.has(normalized)) return null;
    names.add(normalized);
    const fileSize = new TextEncoder().encode(candidate.content).byteLength;
    if (fileSize > maxFileBytes) return null;
    if (contextSize < maxContextBytes) {
      const content = candidate.content.slice(0, maxContextBytes - contextSize);
      files.push({ name: candidate.name, content });
      contextSize += new TextEncoder().encode(content).byteLength;
    }
  }
  return files;
}

function parseAssistantResponse(value: string) {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return {
      markdown: typeof parsed.markdown === "string" ? parsed.markdown.slice(0, 40_000) : value.slice(0, 40_000),
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    };
  } catch {
    return { markdown: value.slice(0, 40_000), changes: [] };
  }
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk untuk memakai CourseUp AI." }, 401);
  return json({ models: getModels() });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return json({ error: "Silakan masuk untuk memakai CourseUp AI." }, 401);

  const body = await readJson(request);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const activeFileName = typeof body?.activeFileName === "string" ? body.activeFileName : "";
  const modelId = typeof body?.modelId === "string" ? body.modelId : "";
  const files = validateFiles(body?.files, activeFileName);
  const model = getModels().find((option) => option.id === modelId);
  const history = Array.isArray(body?.history) ? body.history : [];
  if (!prompt || prompt.length > 2000 || !files || !model || history.length > 12) {
    return json({ error: "Prompt, model, atau konteks project tidak valid." }, 422);
  }
  if (history.some((entry) => !entry || typeof entry !== "object" || !["user", "assistant"].includes(String((entry as Record<string, unknown>).role)) || typeof (entry as Record<string, unknown>).content !== "string")) {
    return json({ error: "Riwayat chat tidak valid." }, 422);
  }

  const apiKey = model.provider === "groq" ? process.env.GROQ_API_KEY : process.env.AI_API_KEY;
  if (!apiKey) return json({ error: model.provider === "groq" ? "GROQ_API_KEY belum dikonfigurasi." : "AI_API_KEY belum dikonfigurasi." }, 503);
  const endpoint = model.provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : process.env.AI_API_URL;
  if (!endpoint) return json({ error: "AI_API_URL belum dikonfigurasi." }, 503);

  let target: URL;
  try {
    target = new URL(endpoint);
  } catch {
    return json({ error: "Konfigurasi AI tidak valid." }, 503);
  }
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(target.hostname);
  if (target.protocol !== "https:" && !localDevelopment) return json({ error: "AI provider harus menggunakan HTTPS." }, 503);

  const context = files.map((file) => `--- ${file.name} ---\n${file.content}`).join("\n\n");
  const priorMessages = history.slice(-8).map((entry) => {
    const message = entry as { role: "user" | "assistant"; content: string };
    return { role: message.role, content: message.content.slice(0, 3000) };
  });

  try {
    const response = await fetch(target, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(45_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.model,
        temperature: 0.25,
        max_tokens: 4096,
        messages: [
          { role: "system", content: "You are CourseUp AI, a precise coding tutor with access to the student's current project files. Return one valid JSON object only with this shape: {\"markdown\":\"README-style Markdown answer\",\"changes\":[{\"name\":\"existing/path.ext\",\"content\":\"complete replacement source\"}]}. Explain answers in concise Markdown. When asked to fix or modify code, include complete replacement contents only for changed existing files. Do not create files, run commands, claim changes were applied, or include markdown fences around the JSON. Preserve the project's language and conventions." },
          { role: "user", content: `Current project files:\n${context}` },
          ...priorMessages,
          { role: "user", content: `Active file: ${activeFileName || "none"}\nRequest: ${prompt}` },
        ],
      }),
    });
    const responseText = await response.text();
    if (new TextEncoder().encode(responseText).byteLength > maxResponseBytes) return json({ error: "Respons AI melebihi batas." }, 502);
    if (!response.ok) return json({ error: `AI provider gagal (${response.status}).` }, 502);

    const result = JSON.parse(responseText) as { choices?: Array<{ message?: { content?: unknown } }> };
    const answer = result.choices?.[0]?.message?.content;
    if (typeof answer !== "string") return json({ error: "AI provider mengembalikan format yang tidak didukung." }, 502);
    const parsed = parseAssistantResponse(answer);
    const allowedFiles = new Set(files.map((file) => file.name));
    const changes = parsed.changes.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const change = entry as Record<string, unknown>;
      if (typeof change.name !== "string" || typeof change.content !== "string" || !allowedFiles.has(change.name)) return [];
      if (new TextEncoder().encode(change.content).byteLength > maxFileBytes) return [];
      return [{ name: change.name, content: change.content }];
    }).slice(0, 10);
    return json({ markdown: parsed.markdown, changes });
  } catch {
    return json({ error: "AI provider tidak merespons atau output tidak valid." }, 502);
  }
}