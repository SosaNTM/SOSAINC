// ── Personal Finance Types ─────────────────────────────────────────────────────
// Separate from the business finance types in src/lib/transactionStore.ts.
// These map to the `personal_transactions` Supabase table.

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
  created_at: string;
  updated_at: string;
}

export type NewPersonalTransaction = Omit<PersonalTransaction, "id" | "created_at" | "updated_at">;

export interface TransactionFilters {
  type?: "income" | "expense" | "transfer";
  category?: string;
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
