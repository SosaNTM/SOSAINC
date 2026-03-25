import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get all coin_ids from crypto_prices (seeded + user-added)
    const { data: allCoins } = await supabase
      .from("crypto_prices")
      .select("coin_id");

    const coinIds = allCoins?.map((c: { coin_id: string }) => c.coin_id) || [];

    if (coinIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No coins to update" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Fetch EUR prices from CoinGecko
    const idsParam = coinIds.join(",");
    const response = await fetch(
      `${COINGECKO_API}/coins/markets?vs_currency=eur&ids=${idsParam}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h,7d`,
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const coins = await response.json();

    // 3. Fetch USD prices
    const responseUsd = await fetch(
      `${COINGECKO_API}/simple/price?ids=${idsParam}&vs_currencies=usd`,
    );
    const usdPrices = responseUsd.ok ? await responseUsd.json() : {};

    // 4. Upsert prices
    const upsertData = coins.map((coin: Record<string, unknown>) => ({
      coin_id: coin.id,
      symbol: (coin.symbol as string).toUpperCase(),
      name: coin.name,
      price_eur: coin.current_price || 0,
      price_usd:
        (usdPrices as Record<string, { usd?: number }>)[coin.id as string]
          ?.usd || null,
      market_cap_eur: coin.market_cap || null,
      price_change_24h: coin.price_change_percentage_24h || 0,
      price_change_7d:
        coin.price_change_percentage_7d_in_currency || null,
      ath_eur: coin.ath || null,
      circulating_supply: coin.circulating_supply || null,
      image_url: coin.image || null,
      last_updated: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabase
      .from("crypto_prices")
      .upsert(upsertData, { onConflict: "coin_id" });

    if (upsertError) throw upsertError;

    // 5. Save price history snapshot
    const historyData = coins.map((coin: Record<string, unknown>) => ({
      coin_id: coin.id,
      price_eur: coin.current_price || 0,
      recorded_at: new Date().toISOString(),
    }));

    await supabase.from("crypto_price_history").insert(historyData);

    // 6. Update USD/EUR rate from Tether price
    const tetherCoin = coins.find(
      (c: Record<string, unknown>) => c.id === "tether",
    );
    if (tetherCoin && tetherCoin.current_price) {
      await supabase.from("exchange_rates").upsert(
        {
          from_currency: "USD",
          to_currency: "EUR",
          rate: tetherCoin.current_price,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "from_currency,to_currency" },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: upsertData.length,
        sample: upsertData
          .slice(0, 3)
          .map(
            (c: { symbol: string; price_eur: number }) =>
              `${c.symbol}: €${c.price_eur}`,
          ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
