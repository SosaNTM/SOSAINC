import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/index.ts";

// ─────────────────────────────────────────────────────────────────
// CORS helpers
// ─────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080",
  "https://iconoff.io",
  "https://www.iconoff.io",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// ─────────────────────────────────────────────────────────────────
// Sliding-window rate limiter (in-memory, per-IP)
// ─────────────────────────────────────────────────────────────────

// Map<ip, timestamps[]>
const ipTimestamps = new Map<string, number[]>();

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Checks whether the request from a given IP exceeds the rate limit.
 *
 * @param req       The incoming Request object.
 * @param limit     Maximum number of requests allowed in the window (default: 60).
 * @param windowMs  Sliding window duration in milliseconds (default: 60 000 ms).
 * @returns         A 429 Response with Retry-After header if over-limit, or null if OK.
 */
export function checkRateLimit(
  req: Request,
  limit = 60,
  windowMs = 60_000,
): Response | null {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Retrieve and prune timestamps outside the current window
  const timestamps = (ipTimestamps.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    // Calculate how many seconds until the oldest timestamp falls out of the window
    const oldestInWindow = timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    return new Response(
      JSON.stringify({ error: "Too Many Requests", retryAfter: retryAfterSec }),
      {
        status: 429,
        headers: {
          ...corsHeaders(req),
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
        },
      },
    );
  }

  // Record this request
  timestamps.push(now);
  ipTimestamps.set(ip, timestamps);

  return null;
}

// ─────────────────────────────────────────────────────────────────
// JWT verification
// ─────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  sub?: string;
  email?: string;
  role?: string;
}

/**
 * Verifies the `Authorization: Bearer <token>` header against
 * the Supabase JWT secret (HS256).
 *
 * @param req   The incoming Request object.
 * @returns     A `JwtPayload` with `userId` if valid, or a 401 Response.
 */
export async function verifyJWT(req: Request): Promise<JwtPayload | Response> {
  const authHeader = req.headers.get("authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header" }),
      {
        status: 401,
        headers: {
          ...corsHeaders(req),
          "Content-Type": "application/json",
        },
      },
    );
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");

  if (!jwtSecret) {
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: JWT secret not set" }),
      {
        status: 500,
        headers: {
          ...corsHeaders(req),
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    const sub = (payload.sub as string | undefined) ?? "";

    if (!sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token: missing subject" }),
        {
          status: 401,
          headers: {
            ...corsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }

    return {
      userId: sub,
      sub,
      email: payload.email as string | undefined,
      role: payload.role as string | undefined,
    };
  } catch {
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid or expired token" }),
      {
        status: 401,
        headers: {
          ...corsHeaders(req),
          "Content-Type": "application/json",
        },
      },
    );
  }
}
