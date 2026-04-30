import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { CoinOption } from "../types/crypto";
import { fetchAvailableCoins, searchCoinsRemote, fetchPricesFromCoinGecko } from "../services/cryptoService";

const FALLBACK_COINS: CoinOption[] = [
  { coin_id: "bitcoin",          symbol: "BTC",   name: "Bitcoin",         image_url: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",        price_eur: 0, price_change_24h: 0 },
  { coin_id: "ethereum",         symbol: "ETH",   name: "Ethereum",        image_url: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",     price_eur: 0, price_change_24h: 0 },
  { coin_id: "solana",           symbol: "SOL",   name: "Solana",          image_url: "https://assets.coingecko.com/coins/images/4128/large/solana.png",      price_eur: 0, price_change_24h: 0 },
  { coin_id: "binancecoin",      symbol: "BNB",   name: "BNB",             image_url: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",  price_eur: 0, price_change_24h: 0 },
  { coin_id: "ripple",           symbol: "XRP",   name: "XRP",             image_url: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "cardano",          symbol: "ADA",   name: "Cardano",         image_url: "https://assets.coingecko.com/coins/images/975/large/cardano.png",      price_eur: 0, price_change_24h: 0 },
  { coin_id: "dogecoin",         symbol: "DOGE",  name: "Dogecoin",        image_url: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",       price_eur: 0, price_change_24h: 0 },
  { coin_id: "tether",           symbol: "USDT",  name: "Tether",          image_url: "https://assets.coingecko.com/coins/images/325/large/Tether.png",       price_eur: 0, price_change_24h: 0 },
  { coin_id: "polkadot",         symbol: "DOT",   name: "Polkadot",        image_url: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png",   price_eur: 0, price_change_24h: 0 },
  { coin_id: "avalanche-2",      symbol: "AVAX",  name: "Avalanche",       image_url: "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "chainlink",        symbol: "LINK",  name: "Chainlink",       image_url: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "litecoin",         symbol: "LTC",   name: "Litecoin",        image_url: "https://assets.coingecko.com/coins/images/2/large/litecoin.png",       price_eur: 0, price_change_24h: 0 },
  { coin_id: "tron",             symbol: "TRX",   name: "TRON",            image_url: "https://assets.coingecko.com/coins/images/1094/large/tron-logo.png",    price_eur: 0, price_change_24h: 0 },
  { coin_id: "uniswap",          symbol: "UNI",   name: "Uniswap",         image_url: "https://assets.coingecko.com/coins/images/12504/large/uni.jpg",        price_eur: 0, price_change_24h: 0 },
  { coin_id: "matic-network",    symbol: "MATIC", name: "Polygon",         image_url: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",     price_eur: 0, price_change_24h: 0 },
  { coin_id: "shiba-inu",        symbol: "SHIB",  name: "Shiba Inu",       image_url: "https://assets.coingecko.com/coins/images/11939/large/shiba.png",      price_eur: 0, price_change_24h: 0 },
  { coin_id: "pepe",             symbol: "PEPE",  name: "Pepe",            image_url: "https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg", price_eur: 0, price_change_24h: 0 },
  { coin_id: "sui",              symbol: "SUI",   name: "Sui",             image_url: "https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "aptos",            symbol: "APT",   name: "Aptos",           image_url: "https://assets.coingecko.com/coins/images/26455/large/aptos_round.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "near",             symbol: "NEAR",  name: "NEAR Protocol",   image_url: "https://assets.coingecko.com/coins/images/10365/large/near.jpg",       price_eur: 0, price_change_24h: 0 },
  { coin_id: "hedera-hashgraph", symbol: "HBAR",  name: "Hedera",          image_url: "https://assets.coingecko.com/coins/images/3688/large/hbar.png",        price_eur: 0, price_change_24h: 0 },
  { coin_id: "internet-computer",symbol: "ICP",   name: "Internet Computer",image_url: "https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "arbitrum",         symbol: "ARB",   name: "Arbitrum",        image_url: "https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg", price_eur: 0, price_change_24h: 0 },
  { coin_id: "optimism",         symbol: "OP",    name: "Optimism",        image_url: "https://assets.coingecko.com/coins/images/25244/large/Optimism.png",   price_eur: 0, price_change_24h: 0 },
  { coin_id: "the-open-network", symbol: "TON",   name: "Toncoin",         image_url: "https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "fantom",           symbol: "FTM",   name: "Fantom",          image_url: "https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "cosmos",           symbol: "ATOM",  name: "Cosmos",          image_url: "https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png",  price_eur: 0, price_change_24h: 0 },
  { coin_id: "stellar",          symbol: "XLM",   name: "Stellar",         image_url: "https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "vechain",          symbol: "VET",   name: "VeChain",         image_url: "https://assets.coingecko.com/coins/images/1167/large/VeChain-Logo-768x725.png", price_eur: 0, price_change_24h: 0 },
  { coin_id: "filecoin",         symbol: "FIL",   name: "Filecoin",        image_url: "https://assets.coingecko.com/coins/images/12817/large/filecoin.png",   price_eur: 0, price_change_24h: 0 },
];

function mergePrices(coins: CoinOption[], prices: Array<{ coin_id: string; price_eur: number; price_change_24h: number }>): CoinOption[] {
  const map = new Map(prices.map((p) => [p.coin_id, p]));
  return coins.map((c) => {
    const p = map.get(c.coin_id);
    return p ? { ...c, price_eur: p.price_eur, price_change_24h: p.price_change_24h } : c;
  });
}

interface UseCoinSelectorOptions {
  existingCoinIds: string[];
}

export function useCoinSelector({ existingCoinIds }: UseCoinSelectorOptions) {
  const [allCoins, setAllCoins] = useState<CoinOption[]>([]);
  const [remoteResults, setRemoteResults] = useState<CoinOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRemoteSearch, setIsRemoteSearch] = useState(false);
  const dbAvailable = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchAvailableCoins();
        if (cancelled) return;

        if (data.length > 0) {
          setAllCoins(data);
          dbAvailable.current = true;
          setIsLoading(false);
          return;
        }
      } catch { /* fall through */ }

      // Supabase empty / unavailable — show fallback coins immediately, then enrich with live prices
      if (!cancelled) setAllCoins(FALLBACK_COINS);
      setIsLoading(false);

      try {
        const coinIds = FALLBACK_COINS.map((c) => c.coin_id);
        const prices = await fetchPricesFromCoinGecko(coinIds);
        if (!cancelled && prices.length > 0) {
          setAllCoins((prev) => mergePrices(prev, prices));
        }
      } catch { /* keep 0 prices — CoinGecko might be rate-limited */ }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const localFiltered = useMemo(() => {
    if (!searchQuery) return allCoins;
    const q = searchQuery.toLowerCase();
    return allCoins.filter(
      (c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
    );
  }, [allCoins, searchQuery]);

  // Remote search when no local matches and query >= 2 chars
  useEffect(() => {
    if (searchQuery.length < 2) {
      setRemoteResults([]);
      setIsRemoteSearch(false);
      return;
    }

    if (localFiltered.length > 0) {
      setRemoteResults([]);
      setIsRemoteSearch(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCoinsRemote(searchQuery);
        // Fetch live prices for the search results so they show real prices
        if (results.length > 0) {
          const ids = results.map((r) => r.coin_id);
          try {
            const prices = await fetchPricesFromCoinGecko(ids);
            setRemoteResults(mergePrices(results, prices));
          } catch {
            setRemoteResults(results);
          }
        } else {
          setRemoteResults(results);
        }
        setIsRemoteSearch(true);
      } catch {
        setRemoteResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery, localFiltered.length]);

  const coins = useMemo(() => {
    const source = isRemoteSearch ? remoteResults : localFiltered;
    return source.map((c) => ({
      ...c,
      alreadyOwned: existingCoinIds.includes(c.coin_id),
    }));
  }, [localFiltered, remoteResults, isRemoteSearch, existingCoinIds]);

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setRemoteResults([]);
    setIsRemoteSearch(false);
  }, []);

  return {
    coins,
    isLoading,
    isSearching,
    searchQuery,
    setSearchQuery,
    isRemoteSearch,
    resetSearch,
  };
}
