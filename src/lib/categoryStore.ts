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
  sosa: [
    { id: "ic1", name: "Product Sales", type: "income", icon: "🛒", color: "#3b82f6", taxRate: 22, description: "", enabled: true, order: 0, annualAmount: 320000, monthlyAmounts: [22000,24000,29000,27000,30000,31000,28000,30000,26000,28000,31000,14000] },
    { id: "ic2", name: "Consulting", type: "income", icon: "🎯", color: "#7c3aed", taxRate: 22, description: "", enabled: true, order: 1, annualAmount: 215000, monthlyAmounts: [15000,16000,19000,18000,20000,21000,18000,20000,17000,19000,20000,12000] },
    { id: "ic3", name: "Services", type: "income", icon: "🔧", color: "#059669", taxRate: 22, description: "", enabled: true, order: 2, annualAmount: 98000, monthlyAmounts: [7000,7500,9000,8500,9200,9500,8200,9000,7800,8500,9300,5500] },
    { id: "ic4", name: "Licensing", type: "income", icon: "📄", color: "#d97706", taxRate: 22, description: "", enabled: true, order: 3, annualAmount: 54000, monthlyAmounts: [4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500] },
    { id: "ic5", name: "Rental Income", type: "income", icon: "🏠", color: "#0891b2", taxRate: 22, description: "", enabled: true, order: 4, annualAmount: 22000, monthlyAmounts: [1800,1800,1900,1800,1900,1900,1800,1800,1800,1900,1800,1800] },
    { id: "ec1", name: "Production Staff", type: "expense", costType: "direct", icon: "💼", color: "#e11d48", taxRate: 0, description: "", enabled: true, order: 0, annualAmount: 145000, monthlyAmounts: [12000,12000,12500,12000,12500,12000,12000,12500,12000,12000,12000,11500] },
    { id: "ec2", name: "Materials & Supplies", type: "expense", costType: "direct", icon: "📦", color: "#ea580c", taxRate: 22, description: "", enabled: true, order: 1, annualAmount: 89000, monthlyAmounts: [6500,7000,8200,7500,8000,8500,7200,8000,7000,7500,8200,5400] },
    { id: "ec3", name: "Subcontractors", type: "expense", costType: "direct", icon: "🔧", color: "#d97706", taxRate: 22, description: "", enabled: true, order: 2, annualAmount: 62000, monthlyAmounts: [4500,5000,5800,5200,5500,5800,5000,5500,4800,5200,5600,4100] },
    { id: "ec4", name: "Software Licenses", type: "expense", costType: "direct", icon: "💻", color: "#7c3aed", taxRate: 22, description: "", enabled: true, order: 3, annualAmount: 38000, monthlyAmounts: [3200,3200,3200,3200,3200,3200,3200,3200,3200,3200,3200,2800] },
    { id: "ec5", name: "Rent", type: "expense", costType: "indirect", icon: "🏠", color: "#0891b2", taxRate: 22, description: "", enabled: true, order: 4, annualAmount: 31200, monthlyAmounts: [2600,2600,2600,2600,2600,2600,2600,2600,2600,2600,2600,2600] },
    { id: "ec6", name: "Marketing & Ads", type: "expense", costType: "indirect", icon: "📊", color: "#db2777", taxRate: 22, description: "", enabled: true, order: 5, annualAmount: 48000, monthlyAmounts: [3500,3800,4500,4200,4500,4800,4000,4500,3800,4200,4500,1700] },
    { id: "ec7", name: "Admin & Management", type: "expense", costType: "indirect", icon: "🎯", color: "#6b7280", taxRate: 0, description: "", enabled: true, order: 6, annualAmount: 52000, monthlyAmounts: [4300,4300,4500,4300,4500,4300,4300,4500,4300,4300,4300,4100] },
    { id: "ec8", name: "Utilities", type: "expense", costType: "indirect", icon: "⚡", color: "#f59e0b", taxRate: 22, description: "", enabled: true, order: 7, annualAmount: 18000, monthlyAmounts: [1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500] },
  ],
  keylo: [
    { id: "kic1", name: "Product Sales", type: "income", icon: "🛒", color: "#3b82f6", taxRate: 20, description: "", enabled: true, order: 0, annualAmount: 680000, monthlyAmounts: [38000,41000,52000,49000,56000,62000,48000,60000,53000,59000,88000,74000] },
    { id: "kic2", name: "Wholesale B2B", type: "income", icon: "🏪", color: "#7c3aed", taxRate: 20, description: "", enabled: true, order: 1, annualAmount: 180000, monthlyAmounts: [12000,14000,16000,15000,16000,18000,14000,16000,14000,16000,18000,11000] },
    { id: "kic3", name: "Affiliate Income", type: "income", icon: "📱", color: "#059669", taxRate: 20, description: "", enabled: true, order: 2, annualAmount: 52000, monthlyAmounts: [3200,3500,4200,3800,4500,5000,4000,4800,4200,4600,6200,4000] },
    { id: "kic4", name: "Brand Partnerships", type: "income", icon: "🎯", color: "#d97706", taxRate: 20, description: "", enabled: true, order: 3, annualAmount: 38000, monthlyAmounts: [2000,2500,3000,3000,3500,4000,3000,3500,3000,3500,5000,2000] },
    { id: "kic5", name: "Returns Recovered", type: "income", icon: "📦", color: "#0891b2", taxRate: 20, description: "", enabled: true, order: 4, annualAmount: 12000, monthlyAmounts: [800,900,1000,900,1000,1100,900,1100,1000,1100,1400,800] },
    { id: "kec1", name: "Inventory & COGS", type: "expense", costType: "direct", icon: "📦", color: "#e11d48", taxRate: 0, description: "", enabled: true, order: 0, annualAmount: 310000, monthlyAmounts: [18000,20000,24000,22000,25000,28000,22000,26000,23000,26000,42000,34000] },
    { id: "kec2", name: "Fulfillment & Shipping", type: "expense", costType: "direct", icon: "🚗", color: "#ea580c", taxRate: 20, description: "", enabled: true, order: 1, annualAmount: 92000, monthlyAmounts: [5500,6000,7200,6800,7500,8200,6500,7800,7000,7800,13000,10700] },
    { id: "kec3", name: "Influencer & Content", type: "expense", costType: "direct", icon: "🎨", color: "#d97706", taxRate: 20, description: "", enabled: true, order: 2, annualAmount: 78000, monthlyAmounts: [5000,5500,6500,6000,6800,7200,6000,7000,6200,6800,9000,6000] },
    { id: "kec4", name: "Platform Fees", type: "expense", costType: "direct", icon: "💻", color: "#7c3aed", taxRate: 20, description: "", enabled: true, order: 3, annualAmount: 42000, monthlyAmounts: [2800,3000,3600,3400,3800,4200,3200,3800,3500,3800,5600,3300] },
    { id: "kec5", name: "Warehouse Rent", type: "expense", costType: "indirect", icon: "🏠", color: "#0891b2", taxRate: 20, description: "", enabled: true, order: 4, annualAmount: 62400, monthlyAmounts: [5200,5200,5200,5200,5200,5200,5200,5200,5200,5200,5200,5200] },
    { id: "kec6", name: "Paid Advertising", type: "expense", costType: "indirect", icon: "📊", color: "#db2777", taxRate: 20, description: "", enabled: true, order: 5, annualAmount: 96000, monthlyAmounts: [5500,6000,7500,7000,8000,9000,7000,8500,7500,8500,15000,11000] },
    { id: "kec7", name: "Operations & Admin", type: "expense", costType: "indirect", icon: "🎯", color: "#6b7280", taxRate: 0, description: "", enabled: true, order: 6, annualAmount: 36000, monthlyAmounts: [3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000] },
    { id: "kec8", name: "Utilities & Insurance", type: "expense", costType: "indirect", icon: "⚡", color: "#f59e0b", taxRate: 20, description: "", enabled: true, order: 7, annualAmount: 14400, monthlyAmounts: [1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200,1200] },
  ],
  redx: [
    { id: "ric1", name: "Creative Retainers", type: "income", icon: "🎨", color: "#3b82f6", taxRate: 20, description: "", enabled: true, order: 0, annualAmount: 420000, monthlyAmounts: [28000,30000,36000,34000,38000,40000,34000,38000,34000,38000,40000,30000] },
    { id: "ric2", name: "Media Buying", type: "income", icon: "📊", color: "#7c3aed", taxRate: 20, description: "", enabled: true, order: 1, annualAmount: 260000, monthlyAmounts: [18000,20000,24000,22000,24000,26000,21000,24000,21000,24000,26000,20000] },
    { id: "ric3", name: "Brand Projects", type: "income", icon: "🎯", color: "#059669", taxRate: 20, description: "", enabled: true, order: 2, annualAmount: 145000, monthlyAmounts: [9000,10000,13000,12000,13000,14000,11000,13000,11000,13000,14000,12000] },
    { id: "ric4", name: "Video Production", type: "income", icon: "📱", color: "#d97706", taxRate: 20, description: "", enabled: true, order: 3, annualAmount: 68000, monthlyAmounts: [4500,5000,6000,5500,6000,6500,5500,6000,5500,6000,6500,5000] },
    { id: "ric5", name: "Asset Licensing", type: "income", icon: "📄", color: "#0891b2", taxRate: 20, description: "", enabled: true, order: 4, annualAmount: 28000, monthlyAmounts: [2000,2000,2500,2500,2500,2500,2000,2500,2000,2500,2500,2000] },
    { id: "rec1", name: "Creative Staff", type: "expense", costType: "direct", icon: "💼", color: "#e11d48", taxRate: 0, description: "", enabled: true, order: 0, annualAmount: 195000, monthlyAmounts: [16000,16000,16500,16000,16500,16000,16000,16500,16000,16000,16000,14000] },
    { id: "rec2", name: "Ad Spend (Client)", type: "expense", costType: "direct", icon: "📊", color: "#ea580c", taxRate: 20, description: "", enabled: true, order: 1, annualAmount: 180000, monthlyAmounts: [12000,13000,16000,15000,16000,18000,14000,16000,14000,16000,18000,12000] },
    { id: "rec3", name: "Freelancers & Contractors", type: "expense", costType: "direct", icon: "🔧", color: "#d97706", taxRate: 20, description: "", enabled: true, order: 2, annualAmount: 86000, monthlyAmounts: [6000,6500,7500,7000,7500,8000,6500,7500,6500,7500,8000,7500] },
    { id: "rec4", name: "Creative Software", type: "expense", costType: "direct", icon: "💻", color: "#7c3aed", taxRate: 20, description: "", enabled: true, order: 3, annualAmount: 18000, monthlyAmounts: [1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500] },
    { id: "rec5", name: "Studio Rent", type: "expense", costType: "indirect", icon: "🏠", color: "#0891b2", taxRate: 20, description: "", enabled: true, order: 4, annualAmount: 52800, monthlyAmounts: [4400,4400,4400,4400,4400,4400,4400,4400,4400,4400,4400,4400] },
    { id: "rec6", name: "Business Development", type: "expense", costType: "indirect", icon: "🎯", color: "#db2777", taxRate: 20, description: "", enabled: true, order: 5, annualAmount: 36000, monthlyAmounts: [2500,2800,3500,3200,3500,3800,3000,3500,3000,3500,3500,1700] },
    { id: "rec7", name: "Admin & Ops", type: "expense", costType: "indirect", icon: "📄", color: "#6b7280", taxRate: 0, description: "", enabled: true, order: 6, annualAmount: 48000, monthlyAmounts: [4000,4000,4000,4000,4000,4000,4000,4000,4000,4000,4000,4000] },
    { id: "rec8", name: "Utilities & Office", type: "expense", costType: "indirect", icon: "⚡", color: "#f59e0b", taxRate: 20, description: "", enabled: true, order: 7, annualAmount: 24000, monthlyAmounts: [2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000,2000] },
  ],
  trustme: [
    { id: "tic1", name: "Compliance Consulting", type: "income", icon: "🎯", color: "#3b82f6", taxRate: 20, description: "", enabled: true, order: 0, annualAmount: 510000, monthlyAmounts: [35000,38000,46000,44000,48000,50000,42000,48000,43000,48000,51000,17000] },
    { id: "tic2", name: "Platform Licensing", type: "income", icon: "📄", color: "#7c3aed", taxRate: 20, description: "", enabled: true, order: 1, annualAmount: 210000, monthlyAmounts: [15000,16000,18000,17000,18000,20000,17000,18000,17000,18000,20000,16000] },
    { id: "tic3", name: "Audit Services", type: "income", icon: "📊", color: "#059669", taxRate: 20, description: "", enabled: true, order: 2, annualAmount: 165000, monthlyAmounts: [12000,13000,15000,14000,15000,16000,13000,15000,13000,15000,16000,8000] },
    { id: "tic4", name: "Training & Certification", type: "income", icon: "🎓", color: "#d97706", taxRate: 20, description: "", enabled: true, order: 3, annualAmount: 72000, monthlyAmounts: [5000,5500,6500,6000,6500,7000,5500,6500,6000,6500,7000,3500] },
    { id: "tic5", name: "Data & Analytics", type: "income", icon: "💻", color: "#0891b2", taxRate: 20, description: "", enabled: true, order: 4, annualAmount: 48000, monthlyAmounts: [3500,3800,4200,4000,4200,4500,3800,4200,3800,4200,4500,3300] },
    { id: "tec1", name: "Compliance Team", type: "expense", costType: "direct", icon: "💼", color: "#e11d48", taxRate: 0, description: "", enabled: true, order: 0, annualAmount: 280000, monthlyAmounts: [22000,22000,24000,22000,24000,23000,22000,24000,22000,22000,23000,18000] },
    { id: "tec2", name: "Legal & External Counsel", type: "expense", costType: "direct", icon: "📄", color: "#ea580c", taxRate: 20, description: "", enabled: true, order: 1, annualAmount: 96000, monthlyAmounts: [7000,7500,8500,8000,8500,9000,7500,8500,7500,8500,9000,7000] },
    { id: "tec3", name: "Pen Test & Security", type: "expense", costType: "direct", icon: "🔧", color: "#d97706", taxRate: 20, description: "", enabled: true, order: 2, annualAmount: 64000, monthlyAmounts: [4500,5000,5800,5200,5500,5800,5000,5500,5000,5500,5800,5400] },
    { id: "tec4", name: "Regulatory Software", type: "expense", costType: "direct", icon: "💻", color: "#7c3aed", taxRate: 20, description: "", enabled: true, order: 3, annualAmount: 42000, monthlyAmounts: [3500,3500,3500,3500,3500,3500,3500,3500,3500,3500,3500,3500] },
    { id: "tec5", name: "Office Lease", type: "expense", costType: "indirect", icon: "🏠", color: "#0891b2", taxRate: 20, description: "", enabled: true, order: 4, annualAmount: 78000, monthlyAmounts: [6500,6500,6500,6500,6500,6500,6500,6500,6500,6500,6500,6500] },
    { id: "tec6", name: "Marketing & Events", type: "expense", costType: "indirect", icon: "📊", color: "#db2777", taxRate: 20, description: "", enabled: true, order: 5, annualAmount: 38000, monthlyAmounts: [2500,2800,3500,3200,3500,4000,3000,3500,3000,3500,4000,2500] },
    { id: "tec7", name: "Admin & HR", type: "expense", costType: "indirect", icon: "🎯", color: "#6b7280", taxRate: 0, description: "", enabled: true, order: 6, annualAmount: 62000, monthlyAmounts: [5200,5200,5200,5200,5200,5200,5200,5200,5200,5200,5200,5000] },
    { id: "tec8", name: "Cyber Insurance", type: "expense", costType: "indirect", icon: "⚡", color: "#f59e0b", taxRate: 20, description: "", enabled: true, order: 7, annualAmount: 50400, monthlyAmounts: [4200,4200,4200,4200,4200,4200,4200,4200,4200,4200,4200,4200] },
  ],
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
