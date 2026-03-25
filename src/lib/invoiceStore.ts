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
  sosa: [],
  keylo: [],
  redx: [],
  trustme: [],
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
