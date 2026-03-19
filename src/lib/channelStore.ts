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
  sosa: [
    { id: "ch1", name: "Amazon IT", platform: "amazon", color: "#f59e0b", commissionRate: 15, currency: "EUR", taxRate: 22, status: "active", notes: "", icon: "📦", monthlyRevenue: [12200,13800,16500,15400,17200,18100,16800,19300,17600,18900,21000,18200], orders: 1240 },
    { id: "ch2", name: "Shopify Store", platform: "shopify", color: "#7c3aed", commissionRate: 3, currency: "EUR", taxRate: 22, status: "active", notes: "", icon: "🛒", monthlyRevenue: [8500,9200,11000,10800,12400,13200,11500,12800,11200,12600,14000,12800], orders: 890 },
    { id: "ch3", name: "Etsy Shop", platform: "etsy", color: "#ea580c", commissionRate: 12, currency: "EUR", taxRate: 22, status: "active", notes: "", icon: "🎨", monthlyRevenue: [5800,6200,7800,7200,8100,8600,7400,8200,7000,7800,8500,7400], orders: 450 },
    { id: "ch4", name: "Wholesale B2B", platform: "wholesale", color: "#0891b2", commissionRate: 5, currency: "EUR", taxRate: 22, status: "active", notes: "", icon: "🏪", monthlyRevenue: [4200,4800,5600,5200,5800,6100,5300,5900,5000,5600,6200,5300], orders: 85 },
  ],
  keylo: [
    { id: "kch1", name: "TikTok Shop", platform: "other", color: "#e11d48", commissionRate: 8, currency: "EUR", taxRate: 20, status: "active", notes: "Main growth channel", icon: "📱", monthlyRevenue: [18000,21000,28000,26000,30000,35000,27000,33000,29000,34000,52000,44000], orders: 4820 },
    { id: "kch2", name: "Shopify Plus", platform: "shopify", color: "#7c3aed", commissionRate: 2, currency: "EUR", taxRate: 20, status: "active", notes: "", icon: "🛒", monthlyRevenue: [12000,13500,16000,15000,17000,19000,15000,18000,16000,18000,26000,22000], orders: 2180 },
    { id: "kch3", name: "Amazon EU", platform: "amazon", color: "#f59e0b", commissionRate: 15, currency: "EUR", taxRate: 20, status: "active", notes: "", icon: "📦", monthlyRevenue: [9500,11000,13500,12500,14000,16000,13000,15000,13500,15000,24000,19500], orders: 1650 },
    { id: "kch4", name: "Wholesale Partners", platform: "wholesale", color: "#0891b2", commissionRate: 4, currency: "EUR", taxRate: 20, status: "active", notes: "", icon: "🏪", monthlyRevenue: [5500,6200,7800,7200,8200,9200,7500,8800,7800,8800,14000,11000], orders: 310 },
  ],
  redx: [
    { id: "rch1", name: "Retainer Clients", platform: "consulting", color: "#3b82f6", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "Core recurring revenue", icon: "🎯", monthlyRevenue: [28000,30000,36000,34000,38000,40000,34000,38000,34000,38000,40000,30000], orders: 18 },
    { id: "rch2", name: "Media Buy Management", platform: "consulting", color: "#db2777", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "10–15% of media budget", icon: "📊", monthlyRevenue: [18000,20000,24000,22000,24000,26000,21000,24000,21000,24000,26000,20000], orders: 12 },
    { id: "rch3", name: "Project Work", platform: "freelance", color: "#059669", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "", icon: "🎨", monthlyRevenue: [9000,10000,13000,12000,13000,14000,11000,13000,11000,13000,14000,12000], orders: 28 },
    { id: "rch4", name: "Video & Production", platform: "other", color: "#d97706", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "", icon: "📱", monthlyRevenue: [4500,5000,6000,5500,6000,6500,5500,6000,5500,6000,6500,5000], orders: 15 },
  ],
  trustme: [
    { id: "tch1", name: "Enterprise Retainers", platform: "consulting", color: "#3b82f6", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "Annual compliance contracts", icon: "🎯", monthlyRevenue: [35000,38000,46000,44000,48000,50000,42000,48000,43000,48000,51000,17000], orders: 14 },
    { id: "tch2", name: "SaaS Licensing", platform: "website", color: "#7c3aed", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "KYC/AML platform licenses", icon: "💻", monthlyRevenue: [15000,16000,18000,17000,18000,20000,17000,18000,17000,18000,20000,16000], orders: 22 },
    { id: "tch3", name: "Audit & Assessment", platform: "consulting", color: "#059669", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "", icon: "📊", monthlyRevenue: [12000,13000,15000,14000,15000,16000,13000,15000,13000,15000,16000,8000], orders: 19 },
    { id: "tch4", name: "Training Programs", platform: "other", color: "#d97706", commissionRate: 0, currency: "EUR", taxRate: 20, status: "active", notes: "Online & in-person", icon: "🎓", monthlyRevenue: [5000,5500,6500,6000,6500,7000,5500,6500,6000,6500,7000,3500], orders: 42 },
  ],
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
