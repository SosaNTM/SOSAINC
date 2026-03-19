// Financial Calculation Engine — all metrics derived from monthly data

export const TAX_RATE = 0.24;

export interface MonthlyRecord {
  month: string;
  revenue: number;
  directCosts: number;
  indirectCosts: number;
}

export interface ComputedMonth extends MonthlyRecord {
  totalCosts: number;
  grossProfit: number;
  operatingProfit: number;
  taxes: number;
  netProfit: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

export interface AnnualTotals {
  totalRevenue: number;
  totalDirectCosts: number;
  totalIndirectCosts: number;
  totalCosts: number;
  totalGrossProfit: number;
  totalOperatingProfit: number;
  totalTaxes: number;
  totalNetProfit: number;
  annualGrossMargin: number;
  annualOperatingMargin: number;
  annualNetMargin: number;
}

export interface PreviousYear {
  revenue: number;
  directCosts: number;
  indirectCosts: number;
}

export interface ChangeMetrics {
  revenueChange: number;
  directCostsChange: number;
  indirectCostsChange: number;
  grossProfitChange: number;
  grossMarginChange: number;
  operatingProfitChange: number;
  netProfitChange: number;
  netMarginChange: number;
}

export interface WaterfallBar {
  name: string;
  invisible: number;
  visible: number;
  color: string;
  isSubtraction: boolean;
  glow?: boolean;
}

// Monthly data
export const monthlyRecords: MonthlyRecord[] = [
  { month: "Jan", revenue: 42000, directCosts: 16800, indirectCosts: 11200 },
  { month: "Feb", revenue: 48000, directCosts: 18000, indirectCosts: 12000 },
  { month: "Mar", revenue: 55000, directCosts: 19200, indirectCosts: 12800 },
  { month: "Apr", revenue: 51000, directCosts: 18600, indirectCosts: 12400 },
  { month: "May", revenue: 60000, directCosts: 20400, indirectCosts: 13600 },
  { month: "Jun", revenue: 58000, directCosts: 20100, indirectCosts: 13400 },
  { month: "Jul", revenue: 63000, directCosts: 21000, indirectCosts: 14000 },
  { month: "Aug", revenue: 45000, directCosts: 17400, indirectCosts: 11600 },
  { month: "Sep", revenue: 67000, directCosts: 22200, indirectCosts: 14800 },
  { month: "Oct", revenue: 72000, directCosts: 23400, indirectCosts: 15600 },
  { month: "Nov", revenue: 70000, directCosts: 22800, indirectCosts: 15200 },
  { month: "Dec", revenue: 78000, directCosts: 24600, indirectCosts: 16400 },
];

export const previousYear: PreviousYear = {
  revenue: 598000,
  directCosts: 210000,
  indirectCosts: 148000,
};

// Monthly breakdown for 2024 (previous year) — enables same-period comparisons
export const previousYearMonthly: MonthlyRecord[] = [
  { month: "Jan", revenue: 38000, directCosts: 14200, indirectCosts: 10800 },
  { month: "Feb", revenue: 42000, directCosts: 15400, indirectCosts: 11200 },
  { month: "Mar", revenue: 48000, directCosts: 16800, indirectCosts: 11800 },
  { month: "Apr", revenue: 45000, directCosts: 16000, indirectCosts: 11400 },
  { month: "May", revenue: 52000, directCosts: 17600, indirectCosts: 12200 },
  { month: "Jun", revenue: 50000, directCosts: 17200, indirectCosts: 12000 },
  { month: "Jul", revenue: 54000, directCosts: 18000, indirectCosts: 12600 },
  { month: "Aug", revenue: 40000, directCosts: 15000, indirectCosts: 10600 },
  { month: "Sep", revenue: 58000, directCosts: 19200, indirectCosts: 13200 },
  { month: "Oct", revenue: 62000, directCosts: 20400, indirectCosts: 13800 },
  { month: "Nov", revenue: 56000, directCosts: 18800, indirectCosts: 13000 },
  { month: "Dec", revenue: 53000, directCosts: 21400, indirectCosts: 15400 },
];

// Compute per-month fields
export function computeMonth(m: MonthlyRecord): ComputedMonth {
  const totalCosts = m.directCosts + m.indirectCosts;
  const grossProfit = m.revenue - m.directCosts;
  const operatingProfit = grossProfit - m.indirectCosts;
  const taxes = operatingProfit * TAX_RATE;
  const netProfit = operatingProfit - taxes;
  const grossMargin = m.revenue > 0 ? (grossProfit / m.revenue) * 100 : 0;
  const operatingMargin = m.revenue > 0 ? (operatingProfit / m.revenue) * 100 : 0;
  const netMargin = m.revenue > 0 ? (netProfit / m.revenue) * 100 : 0;
  return { ...m, totalCosts, grossProfit, operatingProfit, taxes, netProfit, grossMargin, operatingMargin, netMargin };
}

// Compute annual totals
export function computeAnnualTotals(records: MonthlyRecord[]): AnnualTotals {
  const totalRevenue = records.reduce((s, r) => s + r.revenue, 0);
  const totalDirectCosts = records.reduce((s, r) => s + r.directCosts, 0);
  const totalIndirectCosts = records.reduce((s, r) => s + r.indirectCosts, 0);
  const totalCosts = totalDirectCosts + totalIndirectCosts;
  const totalGrossProfit = totalRevenue - totalDirectCosts;
  const totalOperatingProfit = totalGrossProfit - totalIndirectCosts;
  const totalTaxes = totalOperatingProfit * TAX_RATE;
  const totalNetProfit = totalOperatingProfit - totalTaxes;
  const annualGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
  const annualOperatingMargin = totalRevenue > 0 ? (totalOperatingProfit / totalRevenue) * 100 : 0;
  const annualNetMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
  return {
    totalRevenue, totalDirectCosts, totalIndirectCosts, totalCosts,
    totalGrossProfit, totalOperatingProfit, totalTaxes, totalNetProfit,
    annualGrossMargin, annualOperatingMargin, annualNetMargin,
  };
}

// Percentage change
function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Compute YoY change metrics
export function computeChanges(totals: AnnualTotals, prev: PreviousYear): ChangeMetrics {
  const prevGrossProfit = prev.revenue - prev.directCosts;
  const prevOperatingProfit = prevGrossProfit - prev.indirectCosts;
  const prevNetProfit = prevOperatingProfit - prevOperatingProfit * TAX_RATE;
  const prevGrossMargin = prev.revenue > 0 ? (prevGrossProfit / prev.revenue) * 100 : 0;
  const prevNetMargin = prev.revenue > 0 ? (prevNetProfit / prev.revenue) * 100 : 0;

  return {
    revenueChange: pctChange(totals.totalRevenue, prev.revenue),
    directCostsChange: pctChange(totals.totalDirectCosts, prev.directCosts),
    indirectCostsChange: pctChange(totals.totalIndirectCosts, prev.indirectCosts),
    grossProfitChange: pctChange(totals.totalGrossProfit, prevGrossProfit),
    grossMarginChange: +(totals.annualGrossMargin - prevGrossMargin).toFixed(1),
    operatingProfitChange: pctChange(totals.totalOperatingProfit, prevOperatingProfit),
    netProfitChange: pctChange(totals.totalNetProfit, prevNetProfit),
    netMarginChange: +(totals.annualNetMargin - prevNetMargin).toFixed(1),
  };
}

// Build waterfall data
export function buildWaterfallData(totals: AnnualTotals): WaterfallBar[] {
  return [
    { name: "Revenue", invisible: 0, visible: totals.totalRevenue, color: "#6ee7b7", isSubtraction: false },
    { name: "COGS", invisible: totals.totalRevenue - totals.totalDirectCosts, visible: totals.totalDirectCosts, color: "#fb923c", isSubtraction: true },
    { name: "Gross Profit", invisible: 0, visible: totals.totalGrossProfit, color: "#6ee7b7", isSubtraction: false, glow: true },
    { name: "OPEX", invisible: totals.totalGrossProfit - totals.totalIndirectCosts, visible: totals.totalIndirectCosts, color: "#fbbf24", isSubtraction: true },
    { name: "EBIT", invisible: 0, visible: totals.totalOperatingProfit, color: "#93c5fd", isSubtraction: false },
    { name: "Taxes", invisible: totals.totalOperatingProfit - totals.totalTaxes, visible: totals.totalTaxes, color: "#fda4af", isSubtraction: true },
    { name: "Net Profit", invisible: 0, visible: totals.totalNetProfit, color: "#c4b5fd", isSubtraction: false, glow: true },
  ];
}

// Euro formatter
export const fmtEur = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  return `€${Math.round(v).toLocaleString("de-DE")}`;
};

export const fmtEurShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(1).replace(".", ",")}K`;
  return `€${Math.round(v).toLocaleString("de-DE")}`;
};

// Cost category types
export type CostType = "direct" | "indirect";

export interface CostCategory {
  id: string;
  label: string;
  icon: string; // lucide icon name
  type: CostType;
}

export const directCostCategories: CostCategory[] = [
  { id: "production-staff", label: "Production Staff", icon: "Users", type: "direct" },
  { id: "subcontractors", label: "Subcontractors", icon: "UserPlus", type: "direct" },
  { id: "materials", label: "Materials & Supplies", icon: "Package", type: "direct" },
  { id: "software-licenses", label: "Software Licenses", icon: "Monitor", type: "direct" },
  { id: "infrastructure", label: "Infrastructure", icon: "Server", type: "direct" },
];

export const indirectCostCategories: CostCategory[] = [
  { id: "rent", label: "Rent", icon: "Building2", type: "indirect" },
  { id: "marketing", label: "Marketing & Ads", icon: "Megaphone", type: "indirect" },
  { id: "admin", label: "Admin & Management", icon: "Briefcase", type: "indirect" },
  { id: "taxes", label: "Taxes & Contributions", icon: "Landmark", type: "indirect" },
  { id: "utilities", label: "Utilities & Insurance", icon: "Shield", type: "indirect" },
  { id: "other", label: "Other", icon: "MoreHorizontal", type: "indirect" },
];
