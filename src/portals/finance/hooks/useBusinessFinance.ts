import { usePortalData } from "@/hooks/usePortalData";
import { usePortalDB } from "@/lib/portalContextDB";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  BusinessRevenue, BusinessCOGS, BusinessOPEX, BusinessFinanceSummary,
  PLStatement, WaterfallDataPoint,
  REVENUE_CATEGORIES, COGS_CATEGORIES, OPEX_CATEGORIES,
} from "../types/businessFinance";

// ── Data Hooks ───────────────────────────────────────────────────────────────

export const useBusinessRevenue = () =>
  usePortalData<BusinessRevenue>("business_revenue", { orderBy: "date", ascending: false });

export const useBusinessCOGS = () =>
  usePortalData<BusinessCOGS>("business_cogs", { orderBy: "date", ascending: false });

export const useBusinessOPEX = () =>
  usePortalData<BusinessOPEX>("business_opex", { orderBy: "date", ascending: false });

// ── Summary Hook (computed from raw data) ────────────────────────────────────

export function useBusinessSummary(period: string, periodType: "monthly" | "quarterly" | "annual") {
  const { data: revenue } = useBusinessRevenue();
  const { data: cogs } = useBusinessCOGS();
  const { data: opex } = useBusinessOPEX();

  return useMemo(() => {
    const { start, end } = periodToDateRange(period, periodType);

    const periodRevenue = revenue.filter(r =>
      !r.is_deleted && r.status !== "projected" && r.date >= start && r.date <= end
    );
    const periodCogs = cogs.filter(c => !c.is_deleted && c.date >= start && c.date <= end);
    const periodOpex = opex.filter(o => !o.is_deleted && o.date >= start && o.date <= end);

    const grossRevenue = sum(periodRevenue, "gross_amount");
    const totalDiscounts = sum(periodRevenue, "discounts");
    const netRevenue = grossRevenue - totalDiscounts;
    const totalCogs = sum(periodCogs, "amount");
    const grossProfit = netRevenue - totalCogs;
    const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const totalOpex = sum(periodOpex, "amount");
    const ebitda = grossProfit - totalOpex;
    const ebitdaMarginPct = netRevenue > 0 ? (ebitda / netRevenue) * 100 : 0;

    return {
      grossRevenue, totalDiscounts, netRevenue, totalCogs,
      grossProfit, grossMarginPct, totalOpex, ebitda, ebitdaMarginPct,
      revenueEntries: periodRevenue,
      cogsEntries: periodCogs,
      opexEntries: periodOpex,
    };
  }, [revenue, cogs, opex, period, periodType]);
}

// ── P&L Statement ────────────────────────────────────────────────────────────

export function usePLStatement(period: string, periodType: "monthly" | "quarterly" | "annual"): PLStatement {
  const { data: revenue } = useBusinessRevenue();
  const { data: cogs } = useBusinessCOGS();
  const { data: opex } = useBusinessOPEX();

  return useMemo(() => {
    const { start, end } = periodToDateRange(period, periodType);

    const pRevenue = revenue.filter(r => !r.is_deleted && r.status !== "projected" && r.date >= start && r.date <= end);
    const pCogs = cogs.filter(c => !c.is_deleted && c.date >= start && c.date <= end);
    const pOpex = opex.filter(o => !o.is_deleted && o.date >= start && o.date <= end);

    const revenueByCategory = groupByCategory(pRevenue, "category", "gross_amount");
    const totalDiscounts = sum(pRevenue, "discounts");
    const netRevenue = sum(pRevenue, "gross_amount") - totalDiscounts;
    const cogsByCategory = groupByCategory(pCogs, "category", "amount");
    const totalCogs = sum(pCogs, "amount");
    const grossProfit = netRevenue - totalCogs;
    const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const opexByCategory = groupByCategory(pOpex, "category", "amount");
    const totalOpex = sum(pOpex, "amount");
    const ebitda = grossProfit - totalOpex;
    const ebitdaMarginPct = netRevenue > 0 ? (ebitda / netRevenue) * 100 : 0;

    return {
      revenueByCategory, totalDiscounts, netRevenue,
      cogsByCategory, totalCogs, grossProfit, grossMarginPct,
      opexByCategory, totalOpex, ebitda, ebitdaMarginPct,
    };
  }, [revenue, cogs, opex, period, periodType]);
}

// ── Waterfall Data ───────────────────────────────────────────────────────────

export function useWaterfallData(period: string, periodType: "monthly" | "quarterly" | "annual"): WaterfallDataPoint[] {
  const summary = useBusinessSummary(period, periodType);

  return useMemo(() => {
    const points: WaterfallDataPoint[] = [];
    let running = 0;

    // Gross Revenue
    running = summary.grossRevenue;
    points.push({ name: "Ricavi Lordi", value: summary.grossRevenue, start: 0, end: running });

    // Discounts (negative)
    if (summary.totalDiscounts > 0) {
      const prev = running;
      running -= summary.totalDiscounts;
      points.push({ name: "Sconti", value: -summary.totalDiscounts, isNegative: true, start: running, end: prev });
    }

    // Net Revenue (subtotal)
    points.push({ name: "Ricavi Netti", value: summary.netRevenue, isTotal: true, start: 0, end: summary.netRevenue });

    // COGS breakdown by category
    const cogsBreakdown = groupByCategory(summary.cogsEntries, "category", "amount");
    for (const item of cogsBreakdown) {
      const prev = running;
      running -= item.amount;
      points.push({ name: item.label, value: -item.amount, isNegative: true, start: running, end: prev });
    }

    // Gross Profit (subtotal)
    points.push({ name: "Utile Lordo", value: summary.grossProfit, isTotal: true, start: 0, end: summary.grossProfit });

    // OPEX breakdown by category
    const opexBreakdown = groupByCategory(summary.opexEntries, "category", "amount");
    for (const item of opexBreakdown) {
      const prev = running;
      running -= item.amount;
      points.push({ name: item.label, value: -item.amount, isNegative: true, start: running, end: prev });
    }

    // EBITDA (final total)
    points.push({ name: "EBITDA", value: summary.ebitda, isTotal: true, start: 0, end: summary.ebitda });

    return points;
  }, [summary]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sum<T>(items: T[], field: keyof T): number {
  return items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);
}

function groupByCategory<T>(
  items: T[], categoryField: keyof T, amountField: keyof T
): { category: string; label: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const cat = String(item[categoryField]);
    map.set(cat, (map.get(cat) || 0) + (Number(item[amountField]) || 0));
  }
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, label: categoryLabel(category), amount }))
    .sort((a, b) => b.amount - a.amount);
}

const CATEGORY_LABELS: Record<string, string> = {
  product_sales: "Vendita Prodotti", services: "Servizi", subscriptions: "Abbonamenti",
  consulting: "Consulenza", licensing: "Licenze", commissions: "Commissioni",
  raw_materials: "Materie Prime", production: "Produzione", packaging: "Packaging",
  shipping: "Spedizione", platform_fees: "Comm. Piattaforma", payment_processing: "Elab. Pagamenti",
  authentication_costs: "Costi Autenticazione",
  marketing: "Marketing", software_tools: "Software", salaries: "Stipendi",
  rent: "Affitto", utilities: "Utenze", legal: "Legale", accounting: "Contabilità",
  travel: "Viaggi", insurance: "Assicurazioni", misc: "Varie", other: "Altro",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " ");
}

function periodToDateRange(period: string, type: string): { start: string; end: string } {
  if (type === "monthly") {
    const d = new Date(`${period}-01`);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: `${period}-01`, end: end.toISOString().slice(0, 10) };
  }
  if (type === "quarterly") {
    const [year, q] = [period.slice(0, 4), period.slice(6)];
    const startMonth = (parseInt(q) - 1) * 3;
    const start = new Date(parseInt(year), startMonth, 1);
    const end = new Date(parseInt(year), startMonth + 3, 0);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }
  return { start: `${period}-01-01`, end: `${period}-12-31` };
}
