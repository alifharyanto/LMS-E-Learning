import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { json } from "@/lib/http";

type RateLimitScope = "ip" | "identity";

declare global {
  var courseUpAuthLimiters: Map<string, Ratelimit> | undefined;
}

function getLimiter(key: string, limit: number) {
  const cache = globalThis.courseUpAuthLimiters ??= new Map<string, Ratelimit>();
  const cached = cache.get(key);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit, "15 m"),
    analytics: false,
    prefix: `courseup:auth:${key}`,
  });
  cache.set(key, limiter);
  return limiter;
}

function clientIp(request: Request) {
  return (request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown").slice(0, 128);
}

export async function enforceAuthRateLimit(
  request: Request,
  action: "login" | "register",
  identity?: string,
) {
  const hasRedisConfig = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!hasRedisConfig) {
    return process.env.NODE_ENV === "production"
      ? json({ error: "Proteksi keamanan belum dikonfigurasi." }, 503)
      : null;
  }

  const scope: RateLimitScope = identity ? "identity" : "ip";
  const limit = action === "login" ? scope === "ip" ? 10 : 5 : 5;
  const key = scope === "ip" ? clientIp(request) : identity!.trim().toLowerCase().slice(0, 150);

  try {
    const result = await getLimiter(`${action}:${scope}:${limit}`, limit).limit(key);
    if (result.success) return null;

    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return json(
      { error: "Terlalu banyak percobaan. Coba lagi beberapa menit." },
      429,
      { "Retry-After": String(retryAfter) },
    );
  } catch (error) {
    console.error("Authentication rate limiter unavailable:", error);
    return process.env.NODE_ENV === "production"
      ? json({ error: "Proteksi keamanan sementara tidak tersedia." }, 503)
      : null;
  }
}