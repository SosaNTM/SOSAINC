// ── Personal Finance Types ─────────────────────────────────────────────────────
// Separate from the business finance types in src/lib/transactionStore.ts.
// These map to the `personal_transactions` Supabase table.

export type CostClassification = "revenue" | "cogs" | "opex" | "other";

export const COST_CLASSIFICATION_CONFIG: Record<CostClassification, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  revenue: { label: "Ricavo",            color: "#4ade80", bgColor: "rgba(74, 222, 128, 0.1)",  icon: "TrendingUp" },
  cogs:    { label: "Costo del Venduto", color: "#fb923c", bgColor: "rgba(251, 146, 60, 0.1)",  icon: "Package" },
  opex:    { label: "Spesa Operativa",   color: "#f87171", bgColor: "rgba(248, 113, 113, 0.1)", icon: "Receipt" },
  other:   { label: "Altro",            color: "#94a3b8", bgColor: "rgba(148, 163, 184, 0.1)", icon: "HelpCircle" },
};

export interface PersonalTransaction {
  id: string;
  user_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;          // always positive; type field determines direction
  currency: string;        // e.g. "EUR"
  category: string;
  subcategory?: string;
  description: string;
  date: string;            // YYYY-MM-DD
  payment_method?: "cash" | "card" | "bank_transfer" | "crypto" | "other";
  is_recurring: boolean;
  recurring_interval?: "weekly" | "monthly" | "yearly";
  tags?: string[];
  receipt_url?: string;
  cost_classification?: CostClassification;
  category_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceCategory {
  id: string;
  portal_id: string;
  name: string;
  slug: string;
  type: CostClassification;
  color: string;
  icon: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NewPersonalTransaction = Omit<PersonalTransaction, "id" | "created_at" | "updated_at">;

export interface TransactionFilters {
  type?: "income" | "expense" | "transfer";
  category?: string;
  costClassification?: CostClassification;
  categoryId?: string;
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  transactionCount: number;
  monthlyBreakdown: MonthlyBreakdown[];
  categoryBreakdown: CategoryBreakdown[];
}

export interface MonthlyBreakdown {
  month: string;   // "2026-03"
  label: string;   // "Mar 26"
  income: number;
  expenses: number;
  net: number;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  color: string;
}

// ── Payment method labels (English) ─────────────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  bank_transfer: "Bank Transfer",
  crypto: "Crypto",
  other: "Other",
};
