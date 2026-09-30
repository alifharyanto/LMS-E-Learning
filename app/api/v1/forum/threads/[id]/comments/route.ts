import { handleV1 } from "@/app/api/v1/_handlers/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleV1(request, ["forum", "threads", id, "comments"]);
}