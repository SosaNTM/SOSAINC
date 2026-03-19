export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export type InvoiceStatus = "paid" | "pending" | "overdue" | "draft";

export interface Invoice {
  id: string;
  number: string;
  client: string;
  date: string;
  dueDate: string;
  items: LineItem[];
  taxRate: number;
  notes: string;
  status: InvoiceStatus;
}

export function computeInvoiceTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

// ── SEED DATA PER PORTAL ─────────────────────────────────────────────────────

const SEED_INVOICES: Record<string, Invoice[]> = {
  sosa: [
    { id: "i1", number: "INV-2025-001", client: "Alpha Corp", date: "2025-12-15", dueDate: "2025-12-30", items: [{ description: "Sviluppo piattaforma web Q4", quantity: 1, unitPrice: 12000 }, { description: "Manutenzione server mensile", quantity: 3, unitPrice: 2000 }], taxRate: 22, notes: "", status: "paid" },
    { id: "i2", number: "INV-2025-002", client: "Beta Solutions", date: "2025-12-10", dueDate: "2025-12-25", items: [{ description: "Consulenza tecnica – Dicembre", quantity: 40, unitPrice: 120 }, { description: "Formazione team interno", quantity: 8, unitPrice: 150 }], taxRate: 22, notes: "", status: "paid" },
    { id: "i3", number: "INV-2025-003", client: "Gamma Tech", date: "2025-12-08", dueDate: "2026-01-08", items: [{ description: "Sprint di sviluppo #12", quantity: 1, unitPrice: 9500 }, { description: "Code review e ottimizzazione", quantity: 1, unitPrice: 3000 }], taxRate: 22, notes: "", status: "pending" },
    { id: "i4", number: "INV-2025-004", client: "Delta Group", date: "2025-12-01", dueDate: "2025-12-15", items: [{ description: "Consulenza strategica", quantity: 1, unitPrice: 10000 }, { description: "Report analisi mercato", quantity: 1, unitPrice: 5000 }], taxRate: 22, notes: "", status: "overdue" },
    { id: "i5", number: "INV-2025-005", client: "Epsilon Labs", date: "2025-11-28", dueDate: "2025-12-12", items: [{ description: "Integrazione API esterna", quantity: 1, unitPrice: 6200 }, { description: "Testing e documentazione", quantity: 1, unitPrice: 3000 }], taxRate: 22, notes: "", status: "paid" },
    { id: "i6", number: "INV-2025-006", client: "Zeta Digital", date: "2025-11-25", dueDate: "2025-12-10", items: [{ description: "Strategia di brand", quantity: 1, unitPrice: 3500 }, { description: "Identità visiva e linee guida", quantity: 1, unitPrice: 2000 }], taxRate: 22, notes: "", status: "overdue" },
    { id: "i7", number: "INV-2025-007", client: "Alpha Corp", date: "2025-11-20", dueDate: "2025-12-20", items: [{ description: "Contratto supporto mensile", quantity: 1, unitPrice: 2200 }, { description: "Interventi straordinari", quantity: 2, unitPrice: 500 }], taxRate: 22, notes: "", status: "paid" },
    { id: "i8", number: "INV-2025-008", client: "Beta Solutions", date: "2025-11-15", dueDate: "2026-01-15", items: [{ description: "Redesign UI/UX completo", quantity: 1, unitPrice: 11000 }, { description: "Prototipazione interattiva", quantity: 1, unitPrice: 3000 }], taxRate: 22, notes: "", status: "pending" },
    { id: "i9", number: "INV-2025-009", client: "Gamma Tech", date: "2025-11-10", dueDate: "2025-12-10", items: [{ description: "Migrazione cloud infrastruttura", quantity: 1, unitPrice: 5800 }, { description: "Setup monitoring e alerting", quantity: 1, unitPrice: 2000 }], taxRate: 22, notes: "", status: "paid" },
    { id: "i10", number: "INV-2025-010", client: "Delta Group", date: "2025-11-05", dueDate: "2026-01-05", items: [{ description: "Audit sicurezza informatica", quantity: 1, unitPrice: 3600 }, { description: "Penetration testing", quantity: 1, unitPrice: 1000 }], taxRate: 22, notes: "", status: "pending" },
    { id: "i11", number: "INV-2025-011", client: "Epsilon Labs", date: "2025-11-02", dueDate: "2025-12-02", items: [{ description: "Data pipeline MVP", quantity: 1, unitPrice: 8000 }, { description: "Dashboard analytics", quantity: 1, unitPrice: 3000 }], taxRate: 22, notes: "Bozza – in attesa di approvazione", status: "draft" },
    { id: "i12", number: "INV-2025-012", client: "Zeta Digital", date: "2025-11-01", dueDate: "2025-12-01", items: [{ description: "Automazione marketing email", quantity: 1, unitPrice: 1500 }, { description: "Setup campagne automatiche", quantity: 1, unitPrice: 1000 }], taxRate: 22, notes: "Bozza", status: "draft" },
  ],
  keylo: [
    { id: "k1", number: "KLO-2025-001", client: "KeyBrand Ltd", date: "2025-12-14", dueDate: "2025-12-29", items: [{ description: "Product Bundle – Winter Drop", quantity: 200, unitPrice: 49 }, { description: "Express Fulfillment", quantity: 200, unitPrice: 5 }], taxRate: 20, notes: "", status: "paid" },
    { id: "k2", number: "KLO-2025-002", client: "LoopMedia", date: "2025-12-11", dueDate: "2025-12-26", items: [{ description: "Influencer Campaign Package", quantity: 1, unitPrice: 8500 }, { description: "Content Production Fee", quantity: 1, unitPrice: 2000 }], taxRate: 20, notes: "", status: "paid" },
    { id: "k3", number: "KLO-2025-003", client: "VibeProd", date: "2025-12-09", dueDate: "2026-01-09", items: [{ description: "Wholesale Order #KL88", quantity: 500, unitPrice: 18 }, { description: "Custom Packaging", quantity: 500, unitPrice: 2 }], taxRate: 20, notes: "", status: "pending" },
    { id: "k4", number: "KLO-2025-004", client: "EchoCommerce", date: "2025-12-03", dueDate: "2025-12-17", items: [{ description: "Dropship Integration Setup", quantity: 1, unitPrice: 4200 }, { description: "Onboarding & Training", quantity: 4, unitPrice: 300 }], taxRate: 20, notes: "", status: "overdue" },
    { id: "k5", number: "KLO-2025-005", client: "NimbusShop", date: "2025-11-27", dueDate: "2025-12-11", items: [{ description: "Seasonal Collection – 120 SKUs", quantity: 120, unitPrice: 35 }, { description: "Photography & Styling", quantity: 1, unitPrice: 3000 }], taxRate: 20, notes: "", status: "paid" },
    { id: "k6", number: "KLO-2025-006", client: "KeyBrand Ltd", date: "2025-11-24", dueDate: "2025-12-08", items: [{ description: "TikTok Shop Activation Fee", quantity: 1, unitPrice: 1800 }, { description: "Live Stream Production", quantity: 2, unitPrice: 950 }], taxRate: 20, notes: "", status: "overdue" },
    { id: "k7", number: "KLO-2025-007", client: "LoopMedia", date: "2025-11-19", dueDate: "2025-12-19", items: [{ description: "Monthly Retainer – Social Commerce", quantity: 1, unitPrice: 3200 }], taxRate: 20, notes: "", status: "paid" },
    { id: "k8", number: "KLO-2025-008", client: "VibeProd", date: "2025-11-14", dueDate: "2026-01-14", items: [{ description: "Warehouse Pick & Pack Q4", quantity: 800, unitPrice: 3 }, { description: "Returns Processing", quantity: 80, unitPrice: 4 }], taxRate: 20, notes: "", status: "pending" },
    { id: "k9", number: "KLO-2025-009", client: "EchoCommerce", date: "2025-11-09", dueDate: "2025-12-09", items: [{ description: "Shopify Plus Store Migration", quantity: 1, unitPrice: 6500 }, { description: "App Integrations (5)", quantity: 5, unitPrice: 400 }], taxRate: 20, notes: "", status: "paid" },
    { id: "k10", number: "KLO-2025-010", client: "NimbusShop", date: "2025-11-04", dueDate: "2026-01-04", items: [{ description: "Klaviyo Email Automation Setup", quantity: 1, unitPrice: 2800 }, { description: "Flow Templates (10)", quantity: 10, unitPrice: 120 }], taxRate: 20, notes: "", status: "pending" },
    { id: "k11", number: "KLO-2025-011", client: "KeyBrand Ltd", date: "2025-11-01", dueDate: "2025-12-01", items: [{ description: "Black Friday Campaign Package", quantity: 1, unitPrice: 9500 }, { description: "Paid Ads Management", quantity: 1, unitPrice: 2500 }], taxRate: 20, notes: "Draft – pending sign-off", status: "draft" },
    { id: "k12", number: "KLO-2025-012", client: "LoopMedia", date: "2025-10-30", dueDate: "2025-11-30", items: [{ description: "YouTube Partnership Campaign", quantity: 1, unitPrice: 5000 }], taxRate: 20, notes: "Draft", status: "draft" },
  ],
  redx: [
    { id: "r1", number: "RDX-2025-001", client: "RedMind Agency", date: "2025-12-16", dueDate: "2025-12-31", items: [{ description: "Brand Identity Full Package", quantity: 1, unitPrice: 15000 }, { description: "Brand Guidelines Document", quantity: 1, unitPrice: 2500 }], taxRate: 20, notes: "", status: "paid" },
    { id: "r2", number: "RDX-2025-002", client: "XtremeDig", date: "2025-12-12", dueDate: "2025-12-27", items: [{ description: "Social Media Campaign – Dec", quantity: 1, unitPrice: 7800 }, { description: "Ad Creative Production (12 assets)", quantity: 12, unitPrice: 250 }], taxRate: 20, notes: "", status: "paid" },
    { id: "r3", number: "RDX-2025-003", client: "MaxImpact", date: "2025-12-07", dueDate: "2026-01-07", items: [{ description: "Landing Page Design & Dev", quantity: 1, unitPrice: 8200 }, { description: "A/B Testing Setup", quantity: 1, unitPrice: 1500 }], taxRate: 20, notes: "", status: "pending" },
    { id: "r4", number: "RDX-2025-004", client: "BoostBrand", date: "2025-12-02", dueDate: "2025-12-16", items: [{ description: "Media Buying – Q4 Budget", quantity: 1, unitPrice: 22000 }, { description: "Campaign Management Fee", quantity: 1, unitPrice: 3000 }], taxRate: 20, notes: "", status: "overdue" },
    { id: "r5", number: "RDX-2025-005", client: "RedMind Agency", date: "2025-11-28", dueDate: "2025-12-12", items: [{ description: "Motion Graphics Package", quantity: 1, unitPrice: 6400 }, { description: "Voiceover & Sound Design", quantity: 1, unitPrice: 1800 }], taxRate: 20, notes: "", status: "paid" },
    { id: "r6", number: "RDX-2025-006", client: "XtremeDig", date: "2025-11-22", dueDate: "2025-12-06", items: [{ description: "SEO Audit & Strategy", quantity: 1, unitPrice: 4200 }, { description: "Content Calendar (3 months)", quantity: 1, unitPrice: 2000 }], taxRate: 20, notes: "", status: "overdue" },
    { id: "r7", number: "RDX-2025-007", client: "MaxImpact", date: "2025-11-18", dueDate: "2025-12-18", items: [{ description: "Monthly Retainer – Creative", quantity: 1, unitPrice: 5500 }], taxRate: 20, notes: "", status: "paid" },
    { id: "r8", number: "RDX-2025-008", client: "BoostBrand", date: "2025-11-13", dueDate: "2026-01-13", items: [{ description: "Rebrand Full Project", quantity: 1, unitPrice: 18000 }, { description: "Signage & Print Assets", quantity: 1, unitPrice: 4000 }], taxRate: 20, notes: "", status: "pending" },
    { id: "r9", number: "RDX-2025-009", client: "RedMind Agency", date: "2025-11-08", dueDate: "2025-12-08", items: [{ description: "Email Marketing Design (8 templates)", quantity: 8, unitPrice: 600 }, { description: "Automation Flows", quantity: 3, unitPrice: 800 }], taxRate: 20, notes: "", status: "paid" },
    { id: "r10", number: "RDX-2025-010", client: "XtremeDig", date: "2025-11-03", dueDate: "2026-01-03", items: [{ description: "Google Ads Creative Suite", quantity: 1, unitPrice: 3800 }, { description: "Conversion Tracking Setup", quantity: 1, unitPrice: 900 }], taxRate: 20, notes: "", status: "pending" },
    { id: "r11", number: "RDX-2025-011", client: "MaxImpact", date: "2025-10-31", dueDate: "2025-11-30", items: [{ description: "Pitch Deck Design", quantity: 1, unitPrice: 4500 }, { description: "Investor One-Pager", quantity: 1, unitPrice: 1200 }], taxRate: 20, notes: "Draft – awaiting client review", status: "draft" },
    { id: "r12", number: "RDX-2025-012", client: "BoostBrand", date: "2025-10-28", dueDate: "2025-11-28", items: [{ description: "Podcast Production (4 episodes)", quantity: 4, unitPrice: 1200 }], taxRate: 20, notes: "Draft", status: "draft" },
  ],
  trustme: [
    { id: "tm1", number: "TME-2025-001", client: "TrustFin Holdings", date: "2025-12-15", dueDate: "2025-12-30", items: [{ description: "AML Compliance Audit Q4", quantity: 1, unitPrice: 18000 }, { description: "Regulatory Report Preparation", quantity: 1, unitPrice: 4500 }], taxRate: 20, notes: "", status: "paid" },
    { id: "tm2", number: "TME-2025-002", client: "SecureVerify Ltd", date: "2025-12-11", dueDate: "2025-12-26", items: [{ description: "KYC Platform Integration", quantity: 1, unitPrice: 12500 }, { description: "Identity Verification API", quantity: 1, unitPrice: 3000 }], taxRate: 20, notes: "", status: "paid" },
    { id: "tm3", number: "TME-2025-003", client: "CompliancePro", date: "2025-12-08", dueDate: "2026-01-08", items: [{ description: "GDPR Gap Analysis", quantity: 1, unitPrice: 8800 }, { description: "Data Flow Mapping", quantity: 1, unitPrice: 2200 }], taxRate: 20, notes: "", status: "pending" },
    { id: "tm4", number: "TME-2025-004", client: "AuditPlus", date: "2025-12-02", dueDate: "2025-12-16", items: [{ description: "ISO 27001 Pre-Audit Assessment", quantity: 1, unitPrice: 14000 }, { description: "Risk Register Development", quantity: 1, unitPrice: 3500 }], taxRate: 20, notes: "", status: "overdue" },
    { id: "tm5", number: "TME-2025-005", client: "TrustFin Holdings", date: "2025-11-27", dueDate: "2025-12-11", items: [{ description: "Transaction Monitoring Setup", quantity: 1, unitPrice: 9200 }, { description: "Alert Thresholds Configuration", quantity: 1, unitPrice: 1800 }], taxRate: 20, notes: "", status: "paid" },
    { id: "tm6", number: "TME-2025-006", client: "SecureVerify Ltd", date: "2025-11-23", dueDate: "2025-12-07", items: [{ description: "Biometric Auth Integration", quantity: 1, unitPrice: 7600 }, { description: "Security Pen Test", quantity: 1, unitPrice: 4000 }], taxRate: 20, notes: "", status: "overdue" },
    { id: "tm7", number: "TME-2025-007", client: "CompliancePro", date: "2025-11-19", dueDate: "2025-12-19", items: [{ description: "Monthly Compliance Retainer", quantity: 1, unitPrice: 5000 }], taxRate: 20, notes: "", status: "paid" },
    { id: "tm8", number: "TME-2025-008", client: "AuditPlus", date: "2025-11-14", dueDate: "2026-01-14", items: [{ description: "SOC 2 Type II Readiness", quantity: 1, unitPrice: 16500 }, { description: "Policy Documentation Suite", quantity: 1, unitPrice: 4200 }], taxRate: 20, notes: "", status: "pending" },
    { id: "tm9", number: "TME-2025-009", client: "TrustFin Holdings", date: "2025-11-09", dueDate: "2025-12-09", items: [{ description: "Open Banking API Compliance", quantity: 1, unitPrice: 11000 }, { description: "PSD2 Documentation", quantity: 1, unitPrice: 2500 }], taxRate: 20, notes: "", status: "paid" },
    { id: "tm10", number: "TME-2025-010", client: "SecureVerify Ltd", date: "2025-11-04", dueDate: "2026-01-04", items: [{ description: "Data Breach Response Plan", quantity: 1, unitPrice: 6800 }, { description: "Incident Response Training", quantity: 4, unitPrice: 500 }], taxRate: 20, notes: "", status: "pending" },
    { id: "tm11", number: "TME-2025-011", client: "CompliancePro", date: "2025-11-01", dueDate: "2025-12-01", items: [{ description: "DORA Readiness Assessment", quantity: 1, unitPrice: 9500 }, { description: "Digital Resilience Roadmap", quantity: 1, unitPrice: 2800 }], taxRate: 20, notes: "Draft – pending legal review", status: "draft" },
    { id: "tm12", number: "TME-2025-012", client: "AuditPlus", date: "2025-10-29", dueDate: "2025-11-29", items: [{ description: "Whistleblower System Setup", quantity: 1, unitPrice: 3500 }], taxRate: 20, notes: "Draft", status: "draft" },
  ],
};

// ── STORE STATE ───────────────────────────────────────────────────────────────

let _portal = "sosa";
const _dataByPortal: Record<string, Invoice[]> = {};
let invoices: Invoice[] = SEED_INVOICES.sosa.map(i => ({ ...i }));
let listeners: (() => void)[] = [];

function notify() { listeners.forEach((l) => l()); }

function ensurePortal(id: string) {
  if (!_dataByPortal[id]) {
    _dataByPortal[id] = (SEED_INVOICES[id] ?? SEED_INVOICES.sosa).map(i => ({ ...i }));
  }
}

export function setActivePortal(id: string) {
  _dataByPortal[_portal] = invoices; // save current state
  ensurePortal(id);
  _portal = id;
  invoices = _dataByPortal[id];
  notify();
}

// ── CRUD API ──────────────────────────────────────────────────────────────────

export function getInvoices(): Invoice[] { return invoices; }

export function addInvoice(inv: Omit<Invoice, "id">) {
  const id = `i${Date.now()}`;
  invoices = [{ ...inv, id }, ...invoices];
  notify();
}

export function updateInvoice(id: string, updates: Partial<Omit<Invoice, "id">>) {
  invoices = invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
  notify();
}

export function removeInvoice(id: string) {
  invoices = invoices.filter((i) => i.id !== id);
  notify();
}

export function duplicateInvoice(id: string) {
  const orig = invoices.find((i) => i.id === id);
  if (!orig) return;
  const copy: Invoice = { ...orig, id: `i${Date.now()}`, number: nextInvoiceNumber(), date: new Date().toISOString().slice(0, 10), status: "draft", notes: "" };
  invoices = [copy, ...invoices];
  notify();
}

export function subscribeInvoices(fn: () => void) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function nextInvoiceNumber(): string {
  const nums = invoices.map((i) => parseInt(i.number.split("-").pop() || "0", 10));
  const next = Math.max(...nums, 0) + 1;
  return `INV-2025-${String(next).padStart(3, "0")}`;
}

export function getUniqueClients(): string[] {
  return [...new Set(invoices.map((i) => i.client))];
}
