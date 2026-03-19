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

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_TRANSACTIONS: Record<string, Transaction[]> = {
  sosa: [
    { id: "t1", date: "2025-12-18", type: "income", description: "Enterprise SaaS License Q4", category: "Licensing", costType: null, amount: 18000 },
    { id: "t2", date: "2025-12-15", type: "income", description: "Client Alpha – Monthly Retainer", category: "Services", costType: null, amount: 12500 },
    { id: "t3", date: "2025-12-12", type: "expense", description: "December Developer Salaries", category: "Production Staff", costType: "direct", amount: 8200 },
    { id: "t4", date: "2025-12-10", type: "expense", description: "Google Ads Campaign", category: "Marketing & Ads", costType: "indirect", amount: 4500 },
    { id: "t5", date: "2025-12-08", type: "income", description: "Consulting – Beta Corp Integration", category: "Consulting", costType: null, amount: 9800 },
    { id: "t6", date: "2025-12-06", type: "expense", description: "AWS Infrastructure Dec", category: "Infrastructure", costType: "direct", amount: 3600 },
    { id: "t7", date: "2025-12-04", type: "expense", description: "Office Rent December", category: "Rent", costType: "indirect", amount: 4000 },
    { id: "t8", date: "2025-12-02", type: "income", description: "Product Sales – Widget Pro", category: "Sales", costType: null, amount: 15200 },
    { id: "t9", date: "2025-12-01", type: "expense", description: "Freelance UI Designer", category: "Subcontractors", costType: "direct", amount: 3200 },
    { id: "t10", date: "2025-11-28", type: "expense", description: "JetBrains & Figma Licenses", category: "Software Licenses", costType: "direct", amount: 1800 },
    { id: "t11", date: "2025-11-25", type: "income", description: "Consulting – Gamma Ltd", category: "Consulting", costType: null, amount: 7600 },
    { id: "t12", date: "2025-11-22", type: "expense", description: "Admin Staff Salaries", category: "Admin & Management", costType: "indirect", amount: 3400 },
    { id: "t13", date: "2025-11-19", type: "expense", description: "Raw Materials Order #47", category: "Materials & Supplies", costType: "direct", amount: 2900 },
    { id: "t14", date: "2025-11-16", type: "income", description: "Licensing – Delta Inc Annual", category: "Licensing", costType: null, amount: 11000 },
    { id: "t15", date: "2025-11-13", type: "expense", description: "Quarterly Tax Payment", category: "Taxes & Contributions", costType: "indirect", amount: 5200 },
    { id: "t16", date: "2025-11-10", type: "income", description: "Services – Omega Support Contract", category: "Services", costType: null, amount: 6400 },
    { id: "t17", date: "2025-11-07", type: "expense", description: "Electricity & Internet Nov", category: "Utilities & Insurance", costType: "indirect", amount: 1500 },
    { id: "t18", date: "2025-11-04", type: "income", description: "Sales – Bulk Order #12", category: "Sales", costType: null, amount: 14000 },
    { id: "t19", date: "2025-11-02", type: "expense", description: "Legal Consulting Fee", category: "Other", costType: "indirect", amount: 2800 },
    { id: "t20", date: "2025-11-01", type: "expense", description: "Backend Developer Contract", category: "Production Staff", costType: "direct", amount: 7500 },
  ],
  keylo: [
    { id: "k1", date: "2025-12-19", type: "income", description: "TikTok Shop Sales – Winter Drop", category: "Sales", costType: null, amount: 24500 },
    { id: "k2", date: "2025-12-16", type: "income", description: "Shopify Revenue – Dec Week 3", category: "Sales", costType: null, amount: 18800 },
    { id: "k3", date: "2025-12-14", type: "expense", description: "Warehouse Fulfillment – Dec", category: "Production Staff", costType: "direct", amount: 6200 },
    { id: "k4", date: "2025-12-12", type: "expense", description: "Meta Ads – Holiday Campaign", category: "Marketing & Ads", costType: "indirect", amount: 9500 },
    { id: "k5", date: "2025-12-10", type: "income", description: "Amazon IT – Bestseller Restocking", category: "Sales", costType: null, amount: 31000 },
    { id: "k6", date: "2025-12-08", type: "expense", description: "Inventory Purchase Batch #21", category: "Materials & Supplies", costType: "direct", amount: 14200 },
    { id: "k7", date: "2025-12-06", type: "expense", description: "Warehouse Rent – December", category: "Rent", costType: "indirect", amount: 5200 },
    { id: "k8", date: "2025-12-03", type: "income", description: "Etsy Shop – Handmade Collection", category: "Sales", costType: null, amount: 8400 },
    { id: "k9", date: "2025-12-01", type: "expense", description: "Influencer Partnership – @loopvibes", category: "Subcontractors", costType: "direct", amount: 4500 },
    { id: "k10", date: "2025-11-29", type: "expense", description: "Shopify Plus & Klaviyo Subs", category: "Software Licenses", costType: "direct", amount: 980 },
    { id: "k11", date: "2025-11-26", type: "income", description: "Black Friday Revenue – All Channels", category: "Sales", costType: null, amount: 62000 },
    { id: "k12", date: "2025-11-23", type: "expense", description: "Logistics & Courier Fees Nov", category: "Admin & Management", costType: "indirect", amount: 4100 },
    { id: "k13", date: "2025-11-20", type: "expense", description: "Photography Session – New SKUs", category: "Subcontractors", costType: "direct", amount: 2200 },
    { id: "k14", date: "2025-11-17", type: "income", description: "Wholesale B2B – Bulk Order #8", category: "Sales", costType: null, amount: 22000 },
    { id: "k15", date: "2025-11-14", type: "expense", description: "VAT Payment Q3", category: "Taxes & Contributions", costType: "indirect", amount: 7800 },
    { id: "k16", date: "2025-11-11", type: "income", description: "LoopMedia Collaboration Revenue", category: "Other Income", costType: null, amount: 5600 },
    { id: "k17", date: "2025-11-08", type: "expense", description: "Packaging Materials – Nov Batch", category: "Materials & Supplies", costType: "direct", amount: 3400 },
    { id: "k18", date: "2025-11-05", type: "income", description: "TikTok Affiliate Commissions", category: "Other Income", costType: null, amount: 4200 },
    { id: "k19", date: "2025-11-03", type: "expense", description: "Returns & Refunds Processing", category: "Other", costType: "indirect", amount: 1900 },
    { id: "k20", date: "2025-11-01", type: "expense", description: "Seasonal Temp Staff", category: "Production Staff", costType: "direct", amount: 8500 },
  ],
  redx: [
    { id: "r1", date: "2025-12-18", type: "income", description: "RedMind – Monthly Creative Retainer", category: "Services", costType: null, amount: 15500 },
    { id: "r2", date: "2025-12-15", type: "income", description: "BoostBrand – Q4 Media Buy Management", category: "Consulting", costType: null, amount: 22000 },
    { id: "r3", date: "2025-12-13", type: "expense", description: "Creative Team Salaries – Dec", category: "Production Staff", costType: "direct", amount: 11200 },
    { id: "r4", date: "2025-12-11", type: "expense", description: "Studio Rental – Dec Production", category: "Rent", costType: "indirect", amount: 3800 },
    { id: "r5", date: "2025-12-09", type: "income", description: "XtremeDig – Brand Identity Project", category: "Services", costType: null, amount: 17500 },
    { id: "r6", date: "2025-12-07", type: "expense", description: "Adobe CC & Figma Teams", category: "Software Licenses", costType: "direct", amount: 1200 },
    { id: "r7", date: "2025-12-05", type: "expense", description: "Freelance Copywriter – Dec", category: "Subcontractors", costType: "direct", amount: 3600 },
    { id: "r8", date: "2025-12-03", type: "income", description: "MaxImpact – Campaign Package", category: "Services", costType: null, amount: 9800 },
    { id: "r9", date: "2025-12-01", type: "expense", description: "Meta Ads (Client Campaigns)", category: "Marketing & Ads", costType: "direct", amount: 28000 },
    { id: "r10", date: "2025-11-28", type: "expense", description: "Google Workspace & Slack", category: "Software Licenses", costType: "direct", amount: 680 },
    { id: "r11", date: "2025-11-25", type: "income", description: "Consulting – Brand Strategy Sprint", category: "Consulting", costType: null, amount: 8200 },
    { id: "r12", date: "2025-11-22", type: "expense", description: "Account Managers Salaries", category: "Admin & Management", costType: "indirect", amount: 6800 },
    { id: "r13", date: "2025-11-19", type: "expense", description: "Video Production Equipment", category: "Materials & Supplies", costType: "direct", amount: 5400 },
    { id: "r14", date: "2025-11-16", type: "income", description: "Licensing – Creative Assets Library", category: "Licensing", costType: null, amount: 4500 },
    { id: "r15", date: "2025-11-13", type: "expense", description: "Corp Tax Installment Q3", category: "Taxes & Contributions", costType: "indirect", amount: 6200 },
    { id: "r16", date: "2025-11-10", type: "income", description: "Podcast Production – Series 2", category: "Services", costType: null, amount: 7200 },
    { id: "r17", date: "2025-11-07", type: "expense", description: "Office Utilities & Insurance", category: "Utilities & Insurance", costType: "indirect", amount: 2100 },
    { id: "r18", date: "2025-11-04", type: "income", description: "Consulting – Campaign Audit", category: "Consulting", costType: null, amount: 5500 },
    { id: "r19", date: "2025-11-02", type: "expense", description: "Legal Review – Client Contracts", category: "Other", costType: "indirect", amount: 1800 },
    { id: "r20", date: "2025-11-01", type: "expense", description: "Motion Graphics Contractor", category: "Subcontractors", costType: "direct", amount: 4200 },
  ],
  trustme: [
    { id: "tm1", date: "2025-12-18", type: "income", description: "TrustFin – AML Audit Q4", category: "Consulting", costType: null, amount: 22500 },
    { id: "tm2", date: "2025-12-15", type: "income", description: "SecureVerify – KYC Platform License", category: "Licensing", costType: null, amount: 15500 },
    { id: "tm3", date: "2025-12-13", type: "expense", description: "Compliance Team Salaries – Dec", category: "Production Staff", costType: "direct", amount: 13800 },
    { id: "tm4", date: "2025-12-11", type: "expense", description: "Legal Counsel Retainer", category: "Other", costType: "indirect", amount: 8500 },
    { id: "tm5", date: "2025-12-09", type: "income", description: "CompliancePro – GDPR Advisory", category: "Consulting", costType: null, amount: 11000 },
    { id: "tm6", date: "2025-12-07", type: "expense", description: "Regulatory Database Subscriptions", category: "Software Licenses", costType: "direct", amount: 3200 },
    { id: "tm7", date: "2025-12-05", type: "expense", description: "Office Lease – December", category: "Rent", costType: "indirect", amount: 6500 },
    { id: "tm8", date: "2025-12-03", type: "income", description: "AuditPlus – ISO Readiness Project", category: "Services", costType: null, amount: 19800 },
    { id: "tm9", date: "2025-12-01", type: "expense", description: "Pen Test Subcontractor", category: "Subcontractors", costType: "direct", amount: 5500 },
    { id: "tm10", date: "2025-11-28", type: "expense", description: "DocuSign & Plaid API Plans", category: "Software Licenses", costType: "direct", amount: 1800 },
    { id: "tm11", date: "2025-11-25", type: "income", description: "TrustFin – Transaction Monitoring", category: "Services", costType: null, amount: 9200 },
    { id: "tm12", date: "2025-11-22", type: "expense", description: "Admin & HR Management", category: "Admin & Management", costType: "indirect", amount: 5200 },
    { id: "tm13", date: "2025-11-19", type: "expense", description: "Compliance Documentation Tools", category: "Materials & Supplies", costType: "direct", amount: 1400 },
    { id: "tm14", date: "2025-11-16", type: "income", description: "Licensing – Risk Assessment Platform", category: "Licensing", costType: null, amount: 14000 },
    { id: "tm15", date: "2025-11-13", type: "expense", description: "Quarterly Tax & Levy Payment", category: "Taxes & Contributions", costType: "indirect", amount: 9600 },
    { id: "tm16", date: "2025-11-10", type: "income", description: "SecureVerify – Biometric Auth", category: "Services", costType: null, amount: 7800 },
    { id: "tm17", date: "2025-11-07", type: "expense", description: "Cyber Liability Insurance", category: "Utilities & Insurance", costType: "indirect", amount: 4200 },
    { id: "tm18", date: "2025-11-04", type: "income", description: "Consulting – DORA Framework", category: "Consulting", costType: null, amount: 12500 },
    { id: "tm19", date: "2025-11-02", type: "expense", description: "Whistleblower Platform Licensing", category: "Other", costType: "indirect", amount: 2800 },
    { id: "tm20", date: "2025-11-01", type: "expense", description: "Senior Risk Analyst Contract", category: "Production Staff", costType: "direct", amount: 11000 },
  ],
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
