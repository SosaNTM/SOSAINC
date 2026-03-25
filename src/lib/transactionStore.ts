import type { CostType } from "./financialCalculations";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  description: string;
  category: string;
  costType: CostType | null; // null for income
  amount: number;
}

const categoryColors: Record<string, string> = {
  // Income
  Sales: "#34d399", Services: "#10b981", Consulting: "#6ee7b7",
  Licensing: "#a7f3d0", "Other Income": "#059669",
  // Direct
  "Production Staff": "#34d399", Subcontractors: "#10b981",
  "Materials & Supplies": "#6ee7b7", "Software Licenses": "#a7f3d0", Infrastructure: "#059669",
  // Indirect
  Rent: "#f59e0b", "Marketing & Ads": "#fbbf24", "Admin & Management": "#d97706",
  "Taxes & Contributions": "#b45309", "Utilities & Insurance": "#fcd34d", Other: "#92400e",
};

export function getCategoryColor(cat: string): string {
  return categoryColors[cat] || "#6b7280";
}

// ── SEED DATA PER PORTAL (cleared — ready for real data) ─────────────────────

const SEED_TRANSACTIONS: Record<string, Transaction[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _dataByPortal: Record<string, Transaction[]> = {};
let transactions: Transaction[] = SEED_TRANSACTIONS.sosa.map(t => ({ ...t }));
let listeners: (() => void)[] = [];

function notify() { listeners.forEach((l) => l()); }

function ensurePortal(id: string) {
  if (!_dataByPortal[id]) {
    _dataByPortal[id] = (SEED_TRANSACTIONS[id] ?? SEED_TRANSACTIONS.sosa).map(t => ({ ...t }));
  }
}

export function setActivePortal(id: string) {
  _dataByPortal[_portal] = transactions;
  ensurePortal(id);
  _portal = id;
  transactions = _dataByPortal[id];
  notify();
}

// ── CRUD API ──────────────────────────────────────────────────────────────────

export function getTransactions(): Transaction[] { return transactions; }

export function addTransaction(tx: Omit<Transaction, "id">) {
  const id = `t${Date.now()}`;
  transactions = [{ ...tx, id }, ...transactions];
  notify();
}

export function updateTransaction(id: string, updates: Partial<Omit<Transaction, "id">>) {
  transactions = transactions.map((t) => (t.id === id ? { ...t, ...updates } : t));
  notify();
}

export function deleteTransaction(id: string) {
  transactions = transactions.filter((t) => t.id !== id);
  notify();
}

export function duplicateTransaction(id: string) {
  const orig = transactions.find((t) => t.id === id);
  if (!orig) return;
  const copy: Transaction = { ...orig, id: `t${Date.now()}`, description: `${orig.description} (copia)` };
  const idx = transactions.indexOf(orig);
  transactions = [...transactions.slice(0, idx + 1), copy, ...transactions.slice(idx + 1)];
  notify();
}

export function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}
