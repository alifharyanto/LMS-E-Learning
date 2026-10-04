import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `courseup_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function POST() {
  const response = json({ success: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}