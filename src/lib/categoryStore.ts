import { useSyncExternalStore } from "react";

export interface AppCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  costType?: "direct" | "indirect";
  icon: string;
  color: string;
  taxRate: number;
  linkedChannelId?: string;
  description: string;
  enabled: boolean;
  order: number;
  annualAmount: number;
  monthlyAmounts: number[];
}

export const categoryIcons = [
  "🛒", "💼", "🎯", "📦", "🔧", "💻", "🏠", "📊",
  "🎨", "📄", "🚗", "🍔", "✈️", "📱", "🎓", "⚡",
];

export const categoryColors = [
  "#3b82f6", "#059669", "#ea580c", "#e11d48",
  "#7c3aed", "#d97706", "#0891b2", "#db2777",
];

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_CATEGORIES: Record<string, AppCategory[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _dataByPortal: Record<string, AppCategory[]> = {};
let categories: AppCategory[] = SEED_CATEGORIES.sosa.map(c => ({ ...c }));
let listeners: (() => void)[] = [];

const notify = () => listeners.forEach(fn => fn());

function ensurePortal(id: string) {
  if (!_dataByPortal[id]) {
    _dataByPortal[id] = (SEED_CATEGORIES[id] ?? SEED_CATEGORIES.sosa).map(c => ({ ...c }));
  }
}

export function setActivePortal(id: string) {
  _dataByPortal[_portal] = categories;
  ensurePortal(id);
  _portal = id;
  categories = _dataByPortal[id];
  notify();
}

// ── CRUD API ──────────────────────────────────────────────────────────────────

export function getCategories() { return categories; }

export function addCategory(cat: Omit<AppCategory, "id">) {
  categories = [...categories, { ...cat, id: "cat" + Date.now() }];
  notify();
}

export function updateCategory(id: string, updates: Partial<Omit<AppCategory, "id">>) {
  categories = categories.map(c => c.id === id ? { ...c, ...updates } : c);
  notify();
}

export function deleteCategory(id: string) {
  categories = categories.filter(c => c.id !== id);
  notify();
}

export function subscribeCategories(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function useCategories() {
  return useSyncExternalStore(subscribeCategories, getCategories, getCategories);
}
