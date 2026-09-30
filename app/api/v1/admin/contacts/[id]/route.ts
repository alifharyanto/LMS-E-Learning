import { handleV1 } from "@/app/api/v1/_handlers/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => handleV1(request, ["admin", "contacts", id]));
}

export function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => handleV1(request, ["admin", "contacts", id]));
}