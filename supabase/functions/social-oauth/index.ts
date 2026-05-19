// supabase/functions/social-oauth/index.ts
//
// Two actions:
//   GET  ?action=auth_url&platform=X&portal_id=Y  — returns signed OAuth URL (requires JWT)
//   POST ?action=callback&platform=X              — exchanges code, stores connection (requires JWT)
//
// CSRF: state = base64(payload).hmac-sha256 — self-contained, no DB needed.
// portal_id is read from the signed state on callback, never from client body.
//
// Required Supabase secrets:
//   INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET
//   FACEBOOK_APP_ID / FACEBOOK_APP_SECRET
//   TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
//   LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
//   TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET
//   OAUTH_STATE_SECRET  (fallback: SUPABASE_JWT_SECRET)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, verifyJWT } from "../_shared/rateLimit.ts";

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(data: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

interface PlatformConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  clientIdVar: string;
  clientSecretVar: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes: "user_profile,user_media",
    clientIdVar: "INSTAGRAM_CLIENT_ID",
    clientSecretVar: "INSTAGRAM_CLIENT_SECRET",
  },
  facebook: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: "pages_read_engagement,pages_show_list,instagram_basic",
    clientIdVar: "FACEBOOK_APP_ID",
    clientSecretVar: "FACEBOOK_APP_SECRET",
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: "user.info.basic,video.list",
    clientIdVar: "TIKTOK_CLIENT_KEY",
    clientSecretVar: "TIKTOK_CLIENT_SECRET",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/youtube.readonly",
    clientIdVar: "GOOGLE_CLIENT_ID",
    clientSecretVar: "GOOGLE_CLIENT_SECRET",
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "r_liteprofile r_emailaddress w_member_social",
    clientIdVar: "LINKEDIN_CLIENT_ID",
    clientSecretVar: "LINKEDIN_CLIENT_SECRET",
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: "tweet.read users.read",
    clientIdVar: "TWITTER_CLIENT_ID",
    clientSecretVar: "TWITTER_CLIENT_SECRET",
  },
};

// ── HMAC-SHA256 state signing ────────────────────────────────────────────────

interface StatePayload {
  portal_id: string;
  user_id: string;
  platform: string;
  exp: number;
  nonce: string;
}

async function getHmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("OAUTH_STATE_SECRET") ?? Deno.env.get("SUPABASE_JWT_SECRET") ?? "";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signState(payload: StatePayload): Promise<string> {
  const key = await getHmacKey();
  const encoded = btoa(JSON.stringify(payload));
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${encoded}.${sigB64}`;
}

async function verifyState(state: string): Promise<StatePayload | null> {
  const dot = state.lastIndexOf(".");
  if (dot === -1) return null;
  const encoded = state.slice(0, dot);
  const sig = state.slice(dot + 1);

  const key = await getHmacKey();
  const expectedBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expectedBuf)));

  if (expectedB64 !== sig) return null;

  try {
    const payload = JSON.parse(atob(encoded)) as StatePayload;
    if (Date.now() > payload.exp) return null; // expired (10 min TTL)
    return payload;
  } catch {
    return null;
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });

  const rl = checkRateLimit(req, 30, 60_000);
  if (rl) return rl;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const platform = url.searchParams.get("platform");

    if (!platform || !PLATFORM_CONFIGS[platform]) {
      return json({ error: "Unknown platform" }, 400, req);
    }

    const config = PLATFORM_CONFIGS[platform];
    const redirectUri = `${Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080"}/oauth/callback`;

    // ── action=auth_url ──────────────────────────────────────────────────────
    if (action === "auth_url") {
      const jwt = await verifyJWT(req);
      if (jwt instanceof Response) return jwt;

      const portalId = url.searchParams.get("portal_id");
      if (!portalId) return json({ error: "Missing portal_id" }, 400, req);

      const clientId = Deno.env.get(config.clientIdVar);
      if (!clientId) {
        return json(
          { error: `${platform} not configured — set ${config.clientIdVar} in Supabase secrets` },
          503,
          req,
        );
      }

      // Verify caller is a member of the requested portal
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );

      const { data: member } = await adminClient
        .from("portal_members")
        .select("role")
        .eq("portal_id", portalId)
        .eq("user_id", jwt.userId)
        .in("role", ["owner", "admin"])
        .maybeSingle();

      if (!member) return json({ error: "Forbidden: must be owner or admin of this portal" }, 403, req);

      const state = await signState({
        portal_id: portalId,
        user_id: jwt.userId,
        platform,
        exp: Date.now() + 10 * 60 * 1000, // 10 min
        nonce: crypto.randomUUID(),
      });

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        response_type: "code",
        state,
      });

      return json({ auth_url: `${config.authUrl}?${params.toString()}` }, 200, req);
    }

    // ── action=callback ──────────────────────────────────────────────────────
    if (action === "callback") {
      const jwt = await verifyJWT(req);
      if (jwt instanceof Response) return jwt;

      let body: { code: string; state: string };
      try {
        body = await req.json() as { code: string; state: string };
      } catch {
        return json({ error: "Invalid JSON body" }, 400, req);
      }

      if (!body.code || !body.state) {
        return json({ error: "Missing code or state" }, 400, req);
      }

      // Verify signed state — extracts portal_id without trusting the client
      const statePayload = await verifyState(body.state);
      if (!statePayload) {
        return json({ error: "Invalid or expired state — please retry the connection" }, 400, req);
      }

      // Ensure the JWT user matches the user who initiated the flow
      if (statePayload.user_id !== jwt.userId) {
        return json({ error: "User mismatch" }, 403, req);
      }

      const clientId = Deno.env.get(config.clientIdVar);
      const clientSecret = Deno.env.get(config.clientSecretVar);
      if (!clientId || !clientSecret) {
        return json({ error: "Platform credentials not configured" }, 503, req);
      }

      // Exchange code for tokens
      const tokenResp = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          code: body.code,
          redirect_uri: redirectUri,
        }).toString(),
      });

      const tokens = await tokenResp.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      };

      if (!tokens.access_token) {
        return json(
          { error: tokens.error_description ?? tokens.error ?? "Token exchange failed" },
          400,
          req,
        );
      }

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );

      const { error: upsertErr } = await adminClient
        .from("social_connections")
        .upsert(
          {
            portal_id: statePayload.portal_id,  // from signed state, not client
            user_id: statePayload.user_id,        // for backward compat / audit
            connected_by: statePayload.user_id,
            platform,
            account_handle: "",
            account_name: "",
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? null,
            token_expires_at: expiresAt,
            is_active: true,
            connected_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "portal_id,platform" },
        );

      if (upsertErr) {
        return json({ error: upsertErr.message }, 500, req);
      }

      return json({ ok: true }, 200, req);
    }

    return json({ error: "Unknown action — use ?action=auth_url or ?action=callback" }, 400, req);
  } catch (err: unknown) {
    return json({ error: String(err) }, 500, req);
  }
});
