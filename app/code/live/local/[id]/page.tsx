import { get } from "@vercel/blob";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LiveWorkspacePreview from "./live-workspace-preview";

export const dynamic = "force-dynamic";

type WorkspaceFile = { name: string; content: string };

export default async function LiveCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!/^\d+$/.test(id) || Number(id) !== user.id) notFound();

  let files: WorkspaceFile[] = [];
  try {
    const blob = await get(`code-workspaces/${user.id}/workspace.json`, { access: "private", useCache: false });
    if (blob) {
      const workspace = await new Response(blob.stream).json() as { files?: unknown };
      if (Array.isArray(workspace.files)) files = workspace.files.filter((file): file is WorkspaceFile => Boolean(file) && typeof file === "object" && typeof file.name === "string" && typeof file.content === "string");
    }
  } catch {}

  return <main className="code-live-page">
    <header><a href="/code">Code Editor</a><span>Live preview · {user.full_name || user.username}</span></header>
    <LiveWorkspacePreview initialFiles={files} />
  </main>;
}