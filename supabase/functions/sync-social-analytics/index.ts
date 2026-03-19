// Supabase Edge Function: sync-social-analytics
// Phase 1: mock/placeholder data. Real OAuth integration is Phase 2.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { connection_id } = await req.json() as { connection_id: string };

    if (!connection_id) {
      return new Response(
        JSON.stringify({ error: "connection_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the connection to validate it exists
    const { data: connection, error: connErr } = await supabase
      .from("social_connections")
      .select("*")
      .eq("id", connection_id)
      .single();

    if (connErr || !connection) {
      return new Response(
        JSON.stringify({ error: "Connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Phase 1: Generate plausible mock analytics for the platform
    const platformDefaults: Record<string, { followers: number; following: number; posts: number }> = {
      instagram: { followers: 1200, following: 400, posts: 85 },
      linkedin: { followers: 800, following: 150, posts: 45 },
      twitter: { followers: 500, following: 300, posts: 620 },
      facebook: { followers: 950, following: 0, posts: 120 },
      tiktok: { followers: 2400, following: 180, posts: 60 },
      youtube: { followers: 340, following: 0, posts: 22 },
    };

    const base = platformDefaults[connection.platform] ?? { followers: 500, following: 100, posts: 50 };
    const jitter = (n: number, pct = 0.05) => Math.round(n * (1 + (Math.random() - 0.5) * pct));

    const snapshot = {
      connection_id,
      user_id: connection.user_id,
      platform: connection.platform,
      snapshot_date: new Date().toISOString().split("T")[0],
      followers_count: jitter(base.followers),
      following_count: jitter(base.following),
      posts_count: jitter(base.posts),
      engagement_rate: Number((2 + Math.random() * 6).toFixed(4)),
      impressions: jitter(8000),
      reach: jitter(5500),
      likes_total: jitter(420),
      comments_total: jitter(38),
      shares_total: jitter(55),
      raw_data: { source: "mock", generated_at: new Date().toISOString() },
    };

    const { data, error } = await supabase
      .from("social_analytics_snapshots")
      .upsert(snapshot, { onConflict: "connection_id,snapshot_date" })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_synced_at on the connection
    await supabase
      .from("social_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection_id);

    return new Response(
      JSON.stringify({ snapshot: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
