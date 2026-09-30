import { handleV1 } from "@/app/api/v1/_handlers/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return handleV1(request, ["auth", "register"]);
}