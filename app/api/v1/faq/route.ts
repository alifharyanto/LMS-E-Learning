import { FAQS } from "@/lib/faqs";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return json({ faqs: FAQS });
}