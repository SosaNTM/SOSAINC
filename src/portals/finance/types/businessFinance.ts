export interface BusinessRevenue {
  id: string;
  portal_id: string;
  user_id: string;
  date: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  gross_amount: number;
  discounts: number;
  net_amount: number;
  currency: string;
  client: string | null;
  invoice_ref: string | null;
  status: "confirmed" | "pending" | "projected";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessCOGS {
  id: string;
  portal_id: string;
  user_id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  linked_revenue_id: string | null;
  vendor: string | null;
  currency: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessOPEX {
  id: string;
  portal_id: string;
  user_id: string;
  date: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  amount: number;
  is_recurring: boolean;
  frequency: "monthly" | "quarterly" | "annual" | "one_time" | null;
  vendor: string | null;
  currency: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessFinanceSummary {
  id: string;
  portal_id: string;
  period: string;
  period_type: "monthly" | "quarterly" | "annual";
  gross_revenue: number;
  net_revenue: number;
  total_cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  total_opex: number;
  ebitda: number;
  ebitda_margin_pct: number;
  net_income: number;
  updated_at: string;
}

export type RevenueCategory =
  | "product_sales" | "services" | "subscriptions" | "consulting"
  | "licensing" | "commissions" | "other";

export type COGSCategory =
  | "raw_materials" | "production" | "packaging" | "shipping"
  | "platform_fees" | "payment_processing" | "authentication_costs" | "other";

export type OPEXCategory =
  | "marketing" | "software_tools" | "salaries" | "rent" | "utilities"
  | "legal" | "accounting" | "travel" | "insurance" | "subscriptions" | "misc";

export const REVENUE_CATEGORIES: { value: RevenueCategory; label: string }[] = [
  { value: "product_sales", label: "Vendita Prodotti" },
  { value: "services", label: "Servizi" },
  { value: "subscriptions", label: "Abbonamenti" },
  { value: "consulting", label: "Consulenza" },
  { value: "licensing", label: "Licenze" },
  { value: "commissions", label: "Commissioni" },
  { value: "other", label: "Altro" },
];

export const COGS_CATEGORIES: { value: COGSCategory; label: string }[] = [
  { value: "raw_materials", label: "Materie Prime" },
  { value: "production", label: "Produzione" },
  { value: "packaging", label: "Packaging" },
  { value: "shipping", label: "Spedizione" },
  { value: "platform_fees", label: "Commissioni Piattaforma" },
  { value: "payment_processing", label: "Elaborazione Pagamenti" },
  { value: "authentication_costs", label: "Costi Autenticazione" },
  { value: "other", label: "Altro" },
];

export const OPEX_CATEGORIES: { value: OPEXCategory; label: string }[] = [
  { value: "marketing", label: "Marketing" },
  { value: "software_tools", label: "Software & Strumenti" },
  { value: "salaries", label: "Stipendi" },
  { value: "rent", label: "Affitto" },
  { value: "utilities", label: "Utenze" },
  { value: "legal", label: "Legale" },
  { value: "accounting", label: "Contabilità" },
  { value: "travel", label: "Viaggi" },
  { value: "insurance", label: "Assicurazioni" },
  { value: "subscriptions", label: "Abbonamenti" },
  { value: "misc", label: "Varie" },
];

export interface WaterfallDataPoint {
  name: string;
  value: number;
  isTotal?: boolean;
  isNegative?: boolean;
  start: number;
  end: number;
}

export interface PLStatement {
  revenueByCategory: { category: string; label: string; amount: number }[];
  totalDiscounts: number;
  netRevenue: number;
  cogsByCategory: { category: string; label: string; amount: number }[];
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  opexByCategory: { category: string; label: string; amount: number }[];
  totalOpex: number;
  ebitda: number;
  ebitdaMarginPct: number;
}
