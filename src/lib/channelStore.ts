import { useSyncExternalStore } from "react";

export interface Channel {
  id: string;
  name: string;
  platform: string;
  color: string;
  commissionRate: number;
  currency: string;
  taxRate: number;
  status: "active" | "paused" | "disconnected";
  notes: string;
  icon: string;
  monthlyRevenue: number[];
  orders: number;
}

export const platformPresets: { id: string; label: string; icon: string; color: string; commission: number }[] = [
  { id: "amazon", label: "Amazon", icon: "📦", color: "#f59e0b", commission: 15 },
  { id: "shopify", label: "Shopify", icon: "🛒", color: "#7c3aed", commission: 3 },
  { id: "etsy", label: "Etsy", icon: "🎨", color: "#ea580c", commission: 12 },
  { id: "ebay", label: "eBay", icon: "🏷️", color: "#3b82f6", commission: 10 },
  { id: "website", label: "Own Website", icon: "🌐", color: "#059669", commission: 0 },
  { id: "wholesale", label: "Wholesale", icon: "🏪", color: "#0891b2", commission: 5 },
  { id: "retail", label: "Retail", icon: "🏬", color: "#db2777", commission: 0 },
  { id: "freelance", label: "Freelance", icon: "💼", color: "#d97706", commission: 0 },
  { id: "consulting", label: "Consulting", icon: "🎯", color: "#e11d48", commission: 0 },
  { id: "other", label: "Other", icon: "➕", color: "#6b7280", commission: 0 },
];

export const channelColors = [
  "#3b82f6", "#059669", "#ea580c", "#e11d48",
  "#7c3aed", "#d97706", "#0891b2", "#db2777",
];

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_CHANNELS: Record<string, Channel[]> = {
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _dataByPortal: Record<string, Channel[]> = {};
let channels: Channel[] = SEED_CHANNELS.sosa.map(c => ({ ...c }));
let listeners: (() => void)[] = [];

const notify = () => listeners.forEach(fn => fn());

function ensurePortal(id: string) {
  if (!_dataByPortal[id]) {
    _dataByPortal[id] = (SEED_CHANNELS[id] ?? SEED_CHANNELS.sosa).map(c => ({ ...c }));
  }
}

export function setActivePortal(id: string) {
  _dataByPortal[_portal] = channels;
  ensurePortal(id);
  _portal = id;
  channels = _dataByPortal[id];
  notify();
}

// ── CRUD API ──────────────────────────────────────────────────────────────────

export function getChannels() { return channels; }

export function addChannel(ch: Omit<Channel, "id">) {
  channels = [...channels, { ...ch, id: "ch" + Date.now() }];
  notify();
}

export function updateChannel(id: string, updates: Partial<Omit<Channel, "id">>) {
  channels = channels.map(c => c.id === id ? { ...c, ...updates } : c);
  notify();
}

export function deleteChannel(id: string) {
  channels = channels.filter(c => c.id !== id);
  notify();
}

export function subscribeChannels(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

export function useChannels() {
  return useSyncExternalStore(subscribeChannels, getChannels, getChannels);
}

export function getChannelTotalRevenue(ch: Channel) {
  return ch.monthlyRevenue.reduce((s, v) => s + v, 0);
}

export function getChannelNetRevenue(ch: Channel) {
  return getChannelTotalRevenue(ch) * (1 - ch.commissionRate / 100);
}

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function getMonthLabels() { return monthLabels; }
