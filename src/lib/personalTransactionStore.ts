// ── Personal Transaction Local Store ──────────────────────────────────────────
// localStorage fallback used when Supabase is not configured.
// All functions accept a portalId so each portal has isolated transaction data.

import type { PersonalTransaction, NewPersonalTransaction, TransactionFilters } from "@/types/finance";

const KEY_PREFIX = "personal_transactions_local";
const LEGACY_KEY = "personal_transactions_local"; // old non-portal key (migration source)

function storageKey(portalId: string): string {
  return `${KEY_PREFIX}_${portalId}`;
}

/** Try to migrate data from the old non-portal key (only for "sosa"). */
function migrateFromLegacy(portalId: string): PersonalTransaction[] | null {
  if (portalId !== "sosa") return null;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersonalTransaction[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* corrupted */ }
  return null;
}

function load(portalId: string): PersonalTransaction[] {
  try {
    const raw = localStorage.getItem(storageKey(portalId));
    if (raw) return JSON.parse(raw) as PersonalTransaction[];
  } catch { /* corrupted */ }

  // Try migration from legacy (sosa only)
  const migrated = migrateFromLegacy(portalId);
  if (migrated) {
    save(migrated, portalId);
    return migrated;
  }

  // Seed demo data for business portals on first load
  if (portalId !== "sosa") {
    const seed = generateBusinessSeed(portalId);
    if (seed.length > 0) {
      save(seed, portalId);
      return seed;
    }
  }
  return [];
}

// ── Realistic demo data for Keylo / RedX / TrustME ──────────────────────────

function generateBusinessSeed(portalId: string): PersonalTransaction[] {
  const now = new Date();
  const d = (daysAgo: number) => {
    const dt = new Date(now); dt.setDate(dt.getDate() - daysAgo);
    return dt.toISOString().slice(0, 10);
  };
  const ts = now.toISOString();
  let counter = 0;
  // Helper — creates one transaction for a specific user
  const txFor = (
    userId: string,
    type: "income" | "expense", amount: number, category: string, description: string,
    date: string, classification: "revenue" | "cogs" | "opex" | "other",
    method?: "card" | "bank_transfer" | "cash",
  ): PersonalTransaction => ({
    id: `seed_${portalId}_${++counter}`, user_id: userId, type, amount, currency: "EUR",
    category, description, date, payment_method: method ?? "bank_transfer",
    is_recurring: false, cost_classification: classification,
    created_at: ts, updated_at: ts,
  });
  // Shortcut bound to a specific user
  const makeTx = (uid: string) => (
    type: "income" | "expense", amount: number, category: string, description: string,
    date: string, classification: "revenue" | "cogs" | "opex" | "other",
    method?: "card" | "bank_transfer" | "cash",
  ) => txFor(uid, type, amount, category, description, date, classification, method);
  const tx = makeTx("usr_001");

  const portals: Record<string, PersonalTransaction[]> = {
    keylo: [
      // Revenue
      tx("income", 28500, "Vendite Prodotti",     "Vendite Vestiaire Collective — Marzo",       d(2),  "revenue"),
      tx("income", 14200, "Vendite Prodotti",     "Vendite eBay — Lotto Vintage #47",           d(5),  "revenue"),
      tx("income",  8900, "Vendite Prodotti",     "Vendite Shopify — Settimana 12",              d(8),  "revenue"),
      tx("income",  3200, "Commissioni",          "Commissioni referral partner Q1",              d(12), "revenue"),
      tx("income", 18700, "Vendite Prodotti",     "Vendite Vestiaire — Febbraio",                d(32), "revenue"),
      tx("income", 11500, "Vendite Prodotti",     "Vendite eBay — Lotto Sneakers",               d(38), "revenue"),
      tx("income",  6800, "Vendite Prodotti",     "Vendite Shopify — Settimana 8",               d(45), "revenue"),
      tx("income", 22100, "Vendite Prodotti",     "Vendite Vestiaire — Gennaio",                 d(60), "revenue"),
      tx("income",  9400, "Vendite Prodotti",     "Vendite eBay — Accessori Luxury",             d(68), "revenue"),
      tx("income",  4500, "Servizi / Consulenze", "Consulenza autenticazione per Grailed",       d(15), "revenue"),
      // COGS
      tx("expense", 12800, "Acquisto Merce",           "Acquisto stock vintage Chanel / Hermès",       d(3),  "cogs"),
      tx("expense",  2100, "Spedizioni / Logistica",   "DHL Express — spedizioni internazionali Mar",  d(4),  "cogs"),
      tx("expense",   850, "Packaging",                "Scatole premium + tissue paper + dust bags",    d(6),  "cogs"),
      tx("expense",  3400, "Commissioni Piattaforma",  "Fee Vestiaire Collective — Marzo",             d(7),  "cogs"),
      tx("expense",  8500, "Acquisto Merce",           "Acquisto lotto borse vintage Milano",           d(20), "cogs"),
      tx("expense",  1600, "Spedizioni / Logistica",   "Spedizioni nazionali — Febbraio",              d(35), "cogs"),
      tx("expense",  2900, "Commissioni Piattaforma",  "Fee eBay + PayPal — Febbraio",                 d(36), "cogs"),
      tx("expense",  6200, "Acquisto Merce",           "Acquisto sneakers DS da privato",               d(50), "cogs"),
      // OPEX
      tx("expense",  1200, "Affitto / Utenze",          "Affitto magazzino Milano — Marzo",             d(1),  "opex"),
      tx("expense",   380, "Software & Abbonamenti",    "Shopify Plus + Entrupy + Klaviyo",             d(1),  "opex"),
      tx("expense",  2500, "Marketing & Pubblicità",    "Meta Ads — campagna Spring Collection",        d(9),  "opex"),
      tx("expense",  1800, "Stipendi / Collaboratori",  "Fotografo prodotti — Marzo",                   d(10), "opex"),
      tx("expense",   650, "Tasse & Contributi",        "Contributi INPS — rata Q1",                    d(14), "opex"),
      tx("expense",   400, "Spese Legali / Commercialista", "Commercialista — contabilità mensile",     d(15), "opex"),
      tx("expense",  1200, "Affitto / Utenze",          "Affitto magazzino — Febbraio",                 d(30), "opex"),
      tx("expense",  2200, "Marketing & Pubblicità",    "Influencer collaboration — Feb",               d(33), "opex"),
      tx("expense",  1800, "Stipendi / Collaboratori",  "Assistente part-time — Febbraio",              d(34), "opex"),
      tx("expense",  1200, "Affitto / Utenze",          "Affitto magazzino — Gennaio",                  d(62), "opex"),
    ],

    redx: [
      // Revenue
      tx("income", 22000, "Servizi / Consulenze", "RedMind — Retainer mensile Marzo",              d(2),  "revenue"),
      tx("income", 15500, "Servizi / Consulenze", "BoostBrand — Gestione campagne Q1",             d(5),  "revenue"),
      tx("income",  8200, "Servizi / Consulenze", "XtremeDig — Brand identity progetto",           d(10), "revenue"),
      tx("income",  4500, "Servizi / Consulenze", "MaxImpact — Pacchetto social media",            d(14), "revenue"),
      tx("income", 18000, "Servizi / Consulenze", "Retainer clienti — Febbraio",                   d(32), "revenue"),
      tx("income", 12500, "Servizi / Consulenze", "Progetto rebranding Delta Corp",                d(40), "revenue"),
      tx("income",  6800, "Commissioni",          "Commissioni media buying — Feb",                 d(42), "revenue"),
      tx("income", 20000, "Servizi / Consulenze", "Retainer clienti — Gennaio",                    d(62), "revenue"),
      tx("income",  9200, "Servizi / Consulenze", "Consulenza strategica Omega Ltd",               d(65), "revenue"),
      // COGS
      tx("expense", 28000, "Commissioni Piattaforma", "Meta Ads spend — campagne clienti Marzo",   d(3),  "cogs"),
      tx("expense",  8500, "Commissioni Piattaforma", "Google Ads spend — campagne clienti",        d(4),  "cogs"),
      tx("expense",  3600, "Acquisto Merce",           "Freelance copywriter — contenuti Mar",      d(7),  "cogs"),
      tx("expense",  2200, "Acquisto Merce",           "Stock footage + music licensing",           d(11), "cogs"),
      tx("expense", 22000, "Commissioni Piattaforma", "Meta Ads spend — Febbraio",                 d(33), "cogs"),
      tx("expense",  6800, "Commissioni Piattaforma", "Google Ads — Febbraio",                     d(34), "cogs"),
      tx("expense",  3200, "Acquisto Merce",           "Freelance designer — assets Feb",           d(37), "cogs"),
      // OPEX
      tx("expense",  3800, "Affitto / Utenze",          "Affitto studio creativo — Marzo",          d(1),  "opex"),
      tx("expense",  1200, "Software & Abbonamenti",    "Adobe CC + Figma + Slack + Notion",        d(1),  "opex"),
      tx("expense", 11200, "Stipendi / Collaboratori",  "Team creativo — stipendi Marzo",           d(1),  "opex"),
      tx("expense",  6800, "Stipendi / Collaboratori",  "Account manager — stipendio Marzo",        d(1),  "opex"),
      tx("expense",  2100, "Tasse & Contributi",        "Contributi INPS team — Marzo",             d(5),  "opex"),
      tx("expense",   800, "Spese Legali / Commercialista", "Consulenza fiscale trimestrale",       d(12), "opex"),
      tx("expense",  3800, "Affitto / Utenze",          "Affitto studio — Febbraio",                d(30), "opex"),
      tx("expense", 11200, "Stipendi / Collaboratori",  "Team creativo — stipendi Feb",             d(30), "opex"),
      tx("expense",  6800, "Stipendi / Collaboratori",  "Account manager — stipendio Feb",          d(30), "opex"),
      tx("expense",  3800, "Affitto / Utenze",          "Affitto studio — Gennaio",                 d(62), "opex"),
    ],

    trustme: [
      // Revenue
      tx("income", 22500, "Servizi / Consulenze", "TrustFin — Audit AML Q1",                      d(3),  "revenue"),
      tx("income", 15500, "Servizi / Consulenze", "SecureVerify — Licenza piattaforma KYC",        d(6),  "revenue"),
      tx("income", 11000, "Servizi / Consulenze", "CompliancePro — Consulenza GDPR",               d(10), "revenue"),
      tx("income", 19800, "Servizi / Consulenze", "AuditPlus — Progetto ISO 27001",                d(14), "revenue"),
      tx("income",  7800, "Servizi / Consulenze", "SecureVerify — Modulo autenticazione biometrica", d(18), "revenue"),
      tx("income", 18000, "Servizi / Consulenze", "TrustFin — Monitoraggio transazioni Feb",       d(35), "revenue"),
      tx("income", 14000, "Servizi / Consulenze", "Licenza Risk Assessment Platform",              d(40), "revenue"),
      tx("income", 12500, "Servizi / Consulenze", "Consulenza framework DORA",                     d(48), "revenue"),
      tx("income", 20000, "Servizi / Consulenze", "AuditPlus — Assessment sicurezza Gen",          d(65), "revenue"),
      // COGS
      tx("expense",  5500, "Acquisto Merce",           "Pen tester esterno — assessment Q1",        d(5),  "cogs"),
      tx("expense",  3200, "Commissioni Piattaforma",  "Database regolamentari — licenze annuali",  d(8),  "cogs"),
      tx("expense",  1800, "Commissioni Piattaforma",  "DocuSign + Plaid API — Marzo",             d(9),  "cogs"),
      tx("expense",  4200, "Acquisto Merce",           "Consulente sicurezza specializzato",         d(20), "cogs"),
      tx("expense",  2800, "Commissioni Piattaforma",  "Piattaforma whistleblowing — licenza",      d(38), "cogs"),
      tx("expense",  1400, "Acquisto Merce",           "Tool documentazione compliance",             d(42), "cogs"),
      // OPEX
      tx("expense",  6500, "Affitto / Utenze",          "Affitto ufficio — Marzo",                  d(1),  "opex"),
      tx("expense", 13800, "Stipendi / Collaboratori",  "Team compliance — stipendi Marzo",         d(1),  "opex"),
      tx("expense",  8500, "Spese Legali / Commercialista", "Studio legale — retainer mensile",     d(2),  "opex"),
      tx("expense",  2400, "Software & Abbonamenti",    "Vanta + Drata + OneTrust — SaaS",          d(3),  "opex"),
      tx("expense",  4200, "Tasse & Contributi",        "Assicurazione cyber liability",             d(7),  "opex"),
      tx("expense",  9600, "Tasse & Contributi",        "Pagamento imposte trimestrali",             d(13), "opex"),
      tx("expense",  6500, "Affitto / Utenze",          "Affitto ufficio — Febbraio",               d(30), "opex"),
      tx("expense", 13800, "Stipendi / Collaboratori",  "Team compliance — stipendi Feb",           d(30), "opex"),
      tx("expense",  8500, "Spese Legali / Commercialista", "Studio legale — Feb",                  d(30), "opex"),
      tx("expense",  6500, "Affitto / Utenze",          "Affitto ufficio — Gennaio",                d(62), "opex"),
    ],
  };

  return portals[portalId] ?? [];
  // Data is portal-shared: all users on the same portal see the same transactions
}

function save(txs: PersonalTransaction[], portalId: string): void {
  localStorage.setItem(storageKey(portalId), JSON.stringify(txs));
}

export function localGetAll(portalId: string): PersonalTransaction[] {
  return load(portalId);
}

export function localAdd(data: NewPersonalTransaction, userId: string, portalId: string): PersonalTransaction {
  const txs = load(portalId);
  const now = new Date().toISOString();
  const tx: PersonalTransaction = {
    ...data,
    id:         `local_${Date.now()}`,
    user_id:    userId,
    created_at: now,
    updated_at: now,
  };
  save([tx, ...txs], portalId);
  return tx;
}

export function localUpdate(id: string, changes: Partial<NewPersonalTransaction>, portalId: string): void {
  const txs = load(portalId).map((t) =>
    t.id === id ? { ...t, ...changes, updated_at: new Date().toISOString() } : t
  );
  save(txs, portalId);
}

export function localDelete(id: string, portalId: string): void {
  save(load(portalId).filter((t) => t.id !== id), portalId);
}

export function applyFilters(txs: PersonalTransaction[], filters: TransactionFilters): PersonalTransaction[] {
  return txs.filter((tx) => {
    if (filters.type                && tx.type                !== filters.type)               return false;
    if (filters.category            && tx.category            !== filters.category)           return false;
    if (filters.costClassification  && tx.cost_classification !== filters.costClassification) return false;
    if (filters.categoryId          && tx.category_id         !== filters.categoryId)         return false;
    if (filters.dateFrom && tx.date < filters.dateFrom)       return false;
    if (filters.dateTo   && tx.date > filters.dateTo)         return false;
    if (filters.minAmount && tx.amount < filters.minAmount)   return false;
    if (filters.maxAmount && tx.amount > filters.maxAmount)   return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!tx.description?.toLowerCase().includes(q) && !tx.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
