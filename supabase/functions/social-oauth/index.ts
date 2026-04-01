import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, verifyJWT } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGINS = [
  Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080",
  "https://iconoff.io",
];

function corsHeaders(origin: string) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface PlatformConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string;
  clientIdVar: string;
  clientSecretVar: string;
}

// Platform OAuth configs — credentials stored in Supabase Vault / env vars
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

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

interface CallbackBody {
  code: string;
  portal_id: string;
  account_handle?: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }

  const rl = checkRateLimit(req);
  if (rl) return rl;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "auth_url" | "callback"
    const platform = url.searchParams.get("platform");

    if (!platform || !PLATFORM_CONFIGS[platform]) {
      return new Response(
        JSON.stringify({ error: "Unknown platform" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    const config = PLATFORM_CONFIGS[platform];
    const clientId = Deno.env.get(config.clientIdVar);
    const redirectUri = `${Deno.env.get("FRONTEND_URL") ?? "http://localhost:8080"}/oauth/callback?platform=${platform}`;

    // ── action: auth_url ──────────────────────────────────────────────────────
    if (action === "auth_url") {
      if (!clientId) {
        return new Response(
          JSON.stringify({
            error: `${platform} not configured — set ${config.clientIdVar} in Supabase secrets`,
          }),
          { status: 503, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        response_type: "code",
        state: crypto.randomUUID(), // CSRF protection
      });

      const authUrl = `${config.authUrl}?${params.toString()}`;
      return new Response(
        JSON.stringify({ auth_url: authUrl }),
        { headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    // ── action: callback ──────────────────────────────────────────────────────
    if (action === "callback") {
      const jwtAuth = await verifyJWT(req);
      if (jwtAuth instanceof Response) return jwtAuth;

      const body = (await req.json()) as CallbackBody;
      const clientSecret = Deno.env.get(config.clientSecretVar);

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: "Platform credentials not configured" }),
          { status: 503, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }

      const tokenResponse = await fetch(config.tokenUrl, {
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

      const tokens = (await tokenResponse.json()) as TokenResponse;

      if (!tokens.access_token) {
        return new Response(
          JSON.stringify({ error: tokens.error ?? "Token exchange failed" }),
          { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }

      // Store token in Supabase using service role (bypasses RLS for upsert)
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );

      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      const { error: upsertErr } = await supabase
        .from("social_connections")
        .upsert(
          {
            portal_id: body.portal_id,
            platform,
            account_handle: body.account_handle ?? "",
            account_name: body.account_handle ?? "",
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? null,
            token_expires_at: expiresAt,
            is_active: true,
            connected_at: new Date().toISOString(),
          },
          { onConflict: "portal_id,platform" },
        );

      if (upsertErr) {
        return new Response(
          JSON.stringify({ error: upsertErr.message }),
          { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...headers, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action — use ?action=auth_url or ?action=callback" }),
      { status: 400, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } },
    );
  }
});
