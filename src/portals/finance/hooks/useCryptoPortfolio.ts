import { useMemo, useCallback } from "react";
import { useCryptoHoldings } from "./useCryptoHoldings";
import { useCryptoPrices } from "./useCryptoPrices";
import type { EnrichedHolding, CryptoPortfolioSummary } from "../types/crypto";

export function useCryptoPortfolio() {
  const {
    holdings, isLoading: holdingsLoading, error: holdingsError,
    addHolding, updateHolding, deleteHolding, refetch: refetchHoldings,
  } = useCryptoHoldings();
  const {
    prices, isLoading: pricesLoading, lastUpdated,
    refreshPrices, isRefreshing, getPriceForCoin,
    isStale: isPriceStale,
  } = useCryptoPrices();

  const enrichedHoldings = useMemo<EnrichedHolding[]>(() => {
    return holdings
      .map((h) => {
        const price = prices[h.coin_id];
        const currentPrice = price?.price_eur ?? 0;
        const totalValue = h.quantity * currentPrice;
        const priceChange24h = price?.price_change_24h ?? 0;
        const profitLoss =
          h.avg_buy_price_eur != null
            ? (currentPrice - h.avg_buy_price_eur) * h.quantity
            : null;
        const profitLossPercent =
          h.avg_buy_price_eur != null && h.avg_buy_price_eur > 0
            ? ((currentPrice - h.avg_buy_price_eur) / h.avg_buy_price_eur) * 100
            : null;

        return {
          ...h,
          currentPrice,
          totalValue,
          priceChange24h,
          profitLoss,
          profitLossPercent,
          imageUrl: price?.image_url ?? null,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [holdings, prices]);

  const summary = useMemo<CryptoPortfolioSummary>(() => {
    const totalValueEur = enrichedHoldings.reduce((s, h) => s + h.totalValue, 0);

    let totalInvestedEur = 0;
    for (const h of enrichedHoldings) {
      if (h.avg_buy_price_eur != null) {
        totalInvestedEur += h.avg_buy_price_eur * h.quantity;
      }
    }

    const totalProfitLoss = totalValueEur - totalInvestedEur;
    const totalProfitLossPercent =
      totalInvestedEur > 0 ? (totalProfitLoss / totalInvestedEur) * 100 : 0;

    let change24hEur = 0;
    for (const h of enrichedHoldings) {
      change24hEur += h.totalValue * ((h.priceChange24h ?? 0) / 100);
    }
    const denom = totalValueEur - change24hEur;
    const change24hPercent =
      totalValueEur > 0 && denom !== 0 ? (change24hEur / denom) * 100 : 0;

    return {
      totalValueEur,
      totalInvestedEur,
      totalProfitLoss,
      totalProfitLossPercent,
      change24hEur,
      change24hPercent,
      holdingsCount: enrichedHoldings.length,
    };
  }, [enrichedHoldings]);

  const isLoading = holdingsLoading || pricesLoading;
  const error = holdingsError;

  const refreshAll = useCallback(async () => {
    await Promise.all([refetchHoldings(), refreshPrices()]);
  }, [refetchHoldings, refreshPrices]);

  // Wrapped mutations that also refresh prices so new coins get priced immediately
  const addHoldingAndRefresh = useCallback(async (data: Parameters<typeof addHolding>[0]) => {
    await addHolding(data);
    await refreshPrices();
  }, [addHolding, refreshPrices]);

  const updateHoldingAndRefresh = useCallback(async (id: string, data: Parameters<typeof updateHolding>[1]) => {
    await updateHolding(id, data);
    await refreshPrices();
  }, [updateHolding, refreshPrices]);

  const deleteHoldingAndRefresh = useCallback(async (id: string) => {
    await deleteHolding(id);
  }, [deleteHolding]);

  return {
    enrichedHoldings,
    summary,
    isLoading,
    error,
    lastUpdated,
    isRefreshing,
    isPriceStale,
    refreshAll,
    refreshPrices,
    getPriceForCoin,
    addHolding: addHoldingAndRefresh,
    updateHolding: updateHoldingAndRefresh,
    deleteHolding: deleteHoldingAndRefresh,
  };
}
