// ── useNetWorth ──────────────────────────────────────────────────────────────
// Single hook that computes every financial KPI shown on the Dashboard.
//
// NET WORTH = income − expenses − activeSubscriptions + portfolioValue + cryptoValue + giftCardsValue
//
// All amounts converted to EUR via convertToEUR.

import { useMemo } from "react";
import { useDashboardTransactions } from "./useDashboardTransactions";
import { useDashboardSubscriptions } from "./useDashboardSubscriptions";
import { useInvestments } from "./useInvestments";
import { useCryptoPortfolio } from "@/portals/finance/hooks/useCryptoPortfolio";
import { useGiftCards } from "@/portals/finance/hooks/useGiftCards";
import { useGiftCardsSummary } from "@/portals/finance/hooks/useGiftCardsSummary";
import { convertToEUR } from "@/portals/finance/utils/currency";

export interface NetWorthBreakdown {
  netWorth: number;
  income: number;
  expenses: number;
  subscriptionsCost: number;
  portfolioValue: number;
  cryptoValue: number;
  cryptoChange24h: number;
  cryptoChange24hPercent: number;
  giftCardsValue: number;
  giftCardsActiveCount: number;
  giftCardsExpiringSoon: number;
  savingsRate: number;
  lastMonthChange: number;
  balanceTrend: { label: string; balance: number }[];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export function useNetWorth(): NetWorthBreakdown {
  const { transactions } = useDashboardTransactions();
  const { totalMonthly } = useDashboardSubscriptions();
  const { totalValue }   = useInvestments();
  const { summary: cryptoSummary } = useCryptoPortfolio();
  const { cards: giftCards } = useGiftCards();
  const { summary: gcSummary } = useGiftCardsSummary(giftCards);

  return useMemo(() => {
    // ── Aggregate transactions ────────────────────────────────────────
    let income = 0;
    let expenses = 0;

    for (const tx of transactions) {
      const eurAmount = convertToEUR(Math.abs(tx.amount), "EUR");
      if (tx.amount > 0) {
        income += eurAmount;
      } else {
        expenses += eurAmount;
      }
    }

    // ── Subscriptions (monthly active total) ──────────────────────────
    const subscriptionsCost = convertToEUR(totalMonthly, "EUR");

    // ── Portfolio (traditional investments) ──────────────────────────
    const portfolioValue = totalValue;

    // ── Crypto ────────────────────────────────────────────────────────
    const cryptoValue = cryptoSummary?.totalValueEur ?? 0;
    const cryptoChange24h = cryptoSummary?.change24hEur ?? 0;
    const cryptoChange24hPercent = cryptoSummary?.change24hPercent ?? 0;

    // ── Gift Cards ──────────────────────────────────────────────────────
    const giftCardsValue = gcSummary.totalRemainingEur;
    const giftCardsActiveCount = gcSummary.activeCount + gcSummary.partiallyUsedCount;
    const giftCardsExpiringSoon = gcSummary.expiringSoonCount;

    // ── Net Worth ─────────────────────────────────────────────────────
    const netWorth = income - expenses - subscriptionsCost + portfolioValue + cryptoValue + giftCardsValue;

    // ── Savings rate ──────────────────────────────────────────────────
    const savingsRate = income > 0
      ? Math.round(((income - expenses) / income) * 100)
      : 0;

    // ── Last-month change ─────────────────────────────────────────────
    const thirtyDaysAgo = daysAgo(30);
    let recentIncome = 0;
    let recentExpenses = 0;
    for (const tx of transactions) {
      if (tx.date >= thirtyDaysAgo) {
        const eurAmount = convertToEUR(Math.abs(tx.amount), "EUR");
        if (tx.amount > 0) recentIncome += eurAmount;
        else recentExpenses += eurAmount;
      }
    }
    const lastMonthChange = recentIncome - recentExpenses;

    // ── Balance trend (monthly running balance) ───────────────────────
    const balanceTrend = buildBalanceTrend(transactions, portfolioValue + cryptoValue + giftCardsValue, subscriptionsCost);

    return {
      netWorth,
      income,
      expenses,
      subscriptionsCost,
      portfolioValue,
      cryptoValue,
      cryptoChange24h,
      cryptoChange24hPercent,
      giftCardsValue,
      giftCardsActiveCount,
      giftCardsExpiringSoon,
      savingsRate,
      lastMonthChange,
      balanceTrend,
    };
  }, [transactions, totalMonthly, totalValue, cryptoSummary, gcSummary]);
}

// ── Build monthly balance trend from transactions ─────────────────────────────

function buildBalanceTrend(
  transactions: { amount: number; date: Date }[],
  totalAssetValue: number,
  subscriptionsCost: number,
): { label: string; balance: number }[] {
  if (transactions.length === 0) return [];

  const byMonth = new Map<string, number>();

  for (const tx of transactions) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + convertToEUR(tx.amount, "EUR"));
  }

  const sortedMonths = [...byMonth.keys()].sort();

  let running = 0;
  const points: { label: string; balance: number }[] = [];

  for (const monthKey of sortedMonths) {
    running += byMonth.get(monthKey)!;
    const [y, m] = monthKey.split("-");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${monthNames[parseInt(m, 10) - 1]} ${y.slice(2)}`;
    points.push({ label, balance: running + totalAssetValue - subscriptionsCost });
  }

  return points;
}
