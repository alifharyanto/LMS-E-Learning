export async function enforceAuthRateLimit(
  _request: Request,
  _action: "login" | "register",
  _identity?: string,
) {
  return null;
}