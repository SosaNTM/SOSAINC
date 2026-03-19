// P&L Rules global state — drives all financial calculations across the app

import { useSyncExternalStore } from "react";

/* ───── Types ───── */

export type CostType = "direct" | "indirect";

export interface RuleCategory {
  id: string;
  label: string;
  icon: string;
  type: CostType;
  allocationPct: number; // 0-100, how much of this category counts toward its type
  enabled: boolean;
  annualAmount: number;
}

export interface Deduction {
  id: string;
  name: string;
  type: "fixed" | "percent";
  value: number;
  enabled: boolean;
}

export interface RevenueCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  enabled: boolean;
  pct: number; // % of total revenue
}

export interface RulesPreset {
  id: string;
  name: string;
  description: string;
  taxRate: number;
  categories: RuleCategory[];
  deductions: Deduction[];
}

export interface RulesState {
  taxRate: number; // 0-50
  vatRate: number;
  vatAutoApply: boolean;
  categories: RuleCategory[];
  deductions: Deduction[];
  revenueCategories: RevenueCategory[];
  presets: RulesPreset[];
  activePresetId: string;
  dirty: boolean;
}

/* ───── Defaults ───── */

const defaultCategories: RuleCategory[] = [
  { id: "production-staff", label: "Production Staff", icon: "Users", type: "direct", allocationPct: 100, enabled: true, annualAmount: 96200 },
  { id: "subcontractors", label: "Subcontractors", icon: "UserPlus", type: "direct", allocationPct: 100, enabled: true, annualAmount: 42100 },
  { id: "materials", label: "Materials & Supplies", icon: "Package", type: "direct", allocationPct: 100, enabled: true, annualAmount: 36000 },
  { id: "software-licenses", label: "Software Licenses", icon: "Monitor", type: "direct", allocationPct: 100, enabled: true, annualAmount: 28200 },
  { id: "infrastructure", label: "Infrastructure", icon: "Server", type: "direct", allocationPct: 100, enabled: true, annualAmount: 42000 },
  { id: "rent", label: "Rent", icon: "Building2", type: "indirect", allocationPct: 100, enabled: true, annualAmount: 31200 },
  { id: "marketing", label: "Marketing & Ads", icon: "Megaphone", type: "indirect", allocationPct: 100, enabled: true, annualAmount: 40100 },
  { id: "admin", label: "Admin & Management", icon: "Briefcase", type: "indirect", allocationPct: 100, enabled: true, annualAmount: 25200 },
  { id: "taxes-contrib", label: "Taxes & Contributions", icon: "Landmark", type: "indirect", allocationPct: 100, enabled: true, annualAmount: 31500 },
  { id: "utilities", label: "Utilities & Insurance", icon: "Shield", type: "indirect", allocationPct: 100, enabled: true, annualAmount: 11700 },
  { id: "other", label: "Other", icon: "MoreHorizontal", type: "indirect", allocationPct: 100, enabled: true, annualAmount: 22700 },
];

const defaultDeductions: Deduction[] = [
  { id: "interest", name: "Interest Expense", type: "fixed", value: 0, enabled: false },
  { id: "depreciation", name: "Depreciation & Amortization", type: "fixed", value: 0, enabled: false },
  { id: "extraordinary", name: "Extraordinary Costs", type: "fixed", value: 0, enabled: false },
];

const defaultRevenueCategories: RevenueCategory[] = [
  { id: "sales", label: "Sales", icon: "ShoppingCart", color: "#6ee7b7", enabled: true, pct: 45 },
  { id: "services", label: "Services", icon: "Wrench", color: "#93c5fd", enabled: true, pct: 25 },
  { id: "consulting", label: "Consulting", icon: "Users", color: "#67e8f9", enabled: true, pct: 18 },
  { id: "licensing", label: "Licensing", icon: "FileText", color: "#c4b5fd", enabled: true, pct: 12 },
  { id: "other-rev", label: "Other", icon: "MoreHorizontal", color: "#94a3b8", enabled: true, pct: 0 },
];

const defaultPresets: RulesPreset[] = [
  {
    id: "default",
    name: "Default",
    description: "Standard cost allocation with 24% tax",
    taxRate: 24,
    categories: defaultCategories,
    deductions: defaultDeductions,
  },
  {
    id: "conservative",
    name: "Conservative",
    description: "Higher allocations, all deductions active",
    taxRate: 28,
    categories: defaultCategories.map((c) => ({ ...c, allocationPct: c.type === "direct" ? 100 : 100 })),
    deductions: defaultDeductions.map((d) => ({ ...d, enabled: true, value: d.type === "fixed" ? 5000 : 2 })),
  },
  {
    id: "optimistic",
    name: "Optimistic",
    description: "Lower allocations, minimal deductions",
    taxRate: 20,
    categories: defaultCategories.map((c) => ({
      ...c,
      allocationPct: c.type === "direct" ? 85 : 90,
    })),
    deductions: defaultDeductions,
  },
];

/* ───── Store ───── */

type Listener = () => void;
const listeners = new Set<Listener>();

let state: RulesState = {
  taxRate: 24,
  vatRate: 22,
  vatAutoApply: true,
  categories: defaultCategories,
  deductions: defaultDeductions,
  revenueCategories: defaultRevenueCategories,
  presets: defaultPresets,
  activePresetId: "default",
  dirty: false,
};

let savedState = JSON.parse(JSON.stringify(state));

function notify() {
  listeners.forEach((l) => l());
}

export const rulesStore = {
  get: () => state,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },

  setTaxRate: (rate: number) => {
    state = { ...state, taxRate: Math.max(0, Math.min(50, rate)), dirty: true };
    notify();
  },

  setVatRate: (rate: number) => {
    state = { ...state, vatRate: rate, dirty: true };
    notify();
  },

  setVatAutoApply: (v: boolean) => {
    state = { ...state, vatAutoApply: v, dirty: true };
    notify();
  },

  updateCategory: (id: string, updates: Partial<RuleCategory>) => {
    state = {
      ...state,
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      dirty: true,
    };
    notify();
  },

  moveCategory: (id: string, newType: CostType) => {
    state = {
      ...state,
      categories: state.categories.map((c) => (c.id === id ? { ...c, type: newType } : c)),
      dirty: true,
    };
    notify();
  },

  addCategory: (cat: RuleCategory) => {
    state = { ...state, categories: [...state.categories, cat], dirty: true };
    notify();
  },

  removeCategory: (id: string) => {
    state = { ...state, categories: state.categories.filter((c) => c.id !== id), dirty: true };
    notify();
  },

  updateDeduction: (id: string, updates: Partial<Deduction>) => {
    state = {
      ...state,
      deductions: state.deductions.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      dirty: true,
    };
    notify();
  },

  addDeduction: (d: Deduction) => {
    state = { ...state, deductions: [...state.deductions, d], dirty: true };
    notify();
  },

  removeDeduction: (id: string) => {
    state = { ...state, deductions: state.deductions.filter((d) => d.id !== id), dirty: true };
    notify();
  },

  updateRevenueCategory: (id: string, updates: Partial<RevenueCategory>) => {
    state = {
      ...state,
      revenueCategories: state.revenueCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      dirty: true,
    };
    notify();
  },

  addRevenueCategory: (cat: RevenueCategory) => {
    state = { ...state, revenueCategories: [...state.revenueCategories, cat], dirty: true };
    notify();
  },

  removeRevenueCategory: (id: string) => {
    state = { ...state, revenueCategories: state.revenueCategories.filter((c) => c.id !== id), dirty: true };
    notify();
  },

  applyPreset: (presetId: string) => {
    const preset = state.presets.find((p) => p.id === presetId);
    if (!preset) return;
    state = {
      ...state,
      taxRate: preset.taxRate,
      categories: JSON.parse(JSON.stringify(preset.categories)),
      deductions: JSON.parse(JSON.stringify(preset.deductions)),
      activePresetId: presetId,
      dirty: true,
    };
    notify();
  },

  savePreset: (name: string, description: string) => {
    const id = `custom-${Date.now()}`;
    const preset: RulesPreset = {
      id,
      name,
      description,
      taxRate: state.taxRate,
      categories: JSON.parse(JSON.stringify(state.categories)),
      deductions: JSON.parse(JSON.stringify(state.deductions)),
    };
    state = { ...state, presets: [...state.presets, preset] };
    notify();
  },

  save: () => {
    savedState = JSON.parse(JSON.stringify(state));
    state = { ...state, dirty: false };
    notify();
  },
};

/* ───── Computed values from rules ───── */

export function computeFromRules(totalRevenue: number) {
  const s = state;
  const enabledCats = s.categories.filter((c) => c.enabled);

  const directCosts = enabledCats
    .filter((c) => c.type === "direct")
    .reduce((sum, c) => sum + c.annualAmount * (c.allocationPct / 100), 0);

  // Partial allocations: if a direct cost has <100% allocation, the remainder goes to indirect
  const directSpillover = enabledCats
    .filter((c) => c.type === "direct" && c.allocationPct < 100)
    .reduce((sum, c) => sum + c.annualAmount * ((100 - c.allocationPct) / 100), 0);

  const indirectCosts = enabledCats
    .filter((c) => c.type === "indirect")
    .reduce((sum, c) => sum + c.annualAmount * (c.allocationPct / 100), 0) + directSpillover;

  // Indirect spillover to direct (if indirect has <100% allocation)
  const indirectSpilloverToDirect = enabledCats
    .filter((c) => c.type === "indirect" && c.allocationPct < 100)
    .reduce((sum, c) => sum + c.annualAmount * ((100 - c.allocationPct) / 100), 0);

  const effectiveDirectCosts = directCosts + indirectSpilloverToDirect;
  const effectiveIndirectCosts = indirectCosts;

  const grossProfit = totalRevenue - effectiveDirectCosts;
  const ebit = grossProfit - effectiveIndirectCosts;

  // Deductions
  const totalDeductions = s.deductions
    .filter((d) => d.enabled && d.value > 0)
    .reduce((sum, d) => sum + (d.type === "fixed" ? d.value : ebit * (d.value / 100)), 0);

  const ebt = ebit - totalDeductions;
  const taxes = Math.max(0, ebt * (s.taxRate / 100));
  const netProfit = ebt - taxes;

  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const ebitMargin = totalRevenue > 0 ? (ebit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const hasDeductions = totalDeductions > 0;

  return {
    totalRevenue,
    directCosts: effectiveDirectCosts,
    indirectCosts: effectiveIndirectCosts,
    grossProfit,
    ebit,
    totalDeductions,
    hasDeductions,
    ebt,
    taxes,
    netProfit,
    grossMargin,
    ebitMargin,
    netMargin,
    taxRate: s.taxRate,
  };
}

/* ───── Hook ───── */

export function useRules() {
  return useSyncExternalStore(rulesStore.subscribe, rulesStore.get);
}
