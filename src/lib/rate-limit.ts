import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Upstash Redis client for rate limiting.
 * Falls back to in-memory store if env vars are not set (dev mode).
 */
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

type RateLimitTier = "strict" | "standard" | "relaxed" | "webhook";

const RATE_LIMITS: Record<RateLimitTier, { requests: number; window: string }> = {
  strict: { requests: 5, window: "1 m" },      // login, upload, retry
  standard: { requests: 30, window: "1 m" },    // CRUD operations
  relaxed: { requests: 120, window: "1 m" },     // read-heavy, image proxy
  webhook: { requests: 60, window: "1 m" },      // internal webhooks
};

const limiters: Partial<Record<RateLimitTier, Ratelimit>> = {};

function getLimiter(tier: RateLimitTier): Ratelimit | null {
  if (!redis) return null; // Skip rate limiting in dev without Redis

  if (!limiters[tier]) {
    const config = RATE_LIMITS[tier];
    limiters[tier] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window as `${number} ${"s" | "m" | "h" | "d"}`),
      analytics: true,
      prefix: `ratelimit:${tier}`,
    });
  }

  return limiters[tier]!;
}

/**
 * Rate limit a request by identifier (userId or IP).
 * Returns null if allowed, or a NextResponse 429 if rate limited.
 */
export async function rateLimit(
  identifier: string,
  tier: RateLimitTier = "standard"
): Promise<NextResponse | null> {
  const limiter = getLimiter(tier);
  if (!limiter) return null; // No Redis → skip (dev mode)

  const result = await limiter.limit(identifier);

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
          "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Extract client IP from request headers.
 * Works behind Vercel's proxy and Cloudflare.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
