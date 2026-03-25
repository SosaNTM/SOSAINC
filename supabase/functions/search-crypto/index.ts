import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || query.length < 1) {
      return new Response(
        JSON.stringify({ coins: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(
      `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`,
    );

    if (!response.ok) {
      throw new Error(
        `CoinGecko search error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    const coins = (data.coins || [])
      .slice(0, 15)
      .map((coin: Record<string, unknown>) => ({
        id: coin.id,
        symbol: (coin.symbol as string).toUpperCase(),
        name: coin.name,
        thumb: coin.thumb || "",
        market_cap_rank: coin.market_cap_rank || null,
      }));

    return new Response(
      JSON.stringify({ coins }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error searching crypto:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message, coins: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
