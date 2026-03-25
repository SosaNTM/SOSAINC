import { useState, useEffect, useCallback } from "react";
import { fetchCoinHistory } from "../services/cryptoService";
import type { CryptoHolding } from "../types/crypto";

export interface ChartPoint {
  date: string;
  value: number;
}

export function useCryptoChart(holdings: CryptoHolding[], days: number = 30) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChart = useCallback(async () => {
    if (holdings.length === 0) {
      setChartData([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch history for each held coin in parallel
      const results = await Promise.all(
        holdings.map(async (h) => {
          try {
            const history = await fetchCoinHistory(h.coin_id, days);
            return { coinId: h.coin_id, quantity: h.quantity, history };
          } catch {
            return { coinId: h.coin_id, quantity: h.quantity, history: [] };
          }
        }),
      );

      // Build a map: date → total portfolio value
      const dateMap = new Map<number, number>();

      for (const { quantity, history } of results) {
        for (const { timestamp, price } of history) {
          // Round to start of day
          const dayTs = new Date(timestamp).setHours(0, 0, 0, 0);
          dateMap.set(dayTs, (dateMap.get(dayTs) ?? 0) + price * quantity);
        }
      }

      // Sort by date and format
      const sorted = [...dateMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([ts, value]) => {
          const d = new Date(ts);
          const label =
            days <= 7
              ? d.toLocaleDateString("it-IT", { weekday: "short" })
              : days <= 30
                ? `${d.getDate()}/${d.getMonth() + 1}`
                : d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
          return { date: label, value: Math.round(value * 100) / 100 };
        });

      setChartData(sorted);
    } catch (err) {
      console.error("Failed to load chart data:", err);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [holdings, days]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  return { chartData, isLoading };
}
