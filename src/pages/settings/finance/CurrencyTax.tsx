import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Check, X, Plus, Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCurrencySettings, useTaxRates } from "../../../hooks/settings";
import type { TaxRate } from "../../../types/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

// ─── Currency Section ─────────────────────────────────────────────────────────

type MainCurrency = "EUR" | "USD" | "GBP" | "CHF";
type SymbolPosition = "before" | "after";
type SecondaryCurrency = "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD";

const MAIN_CURRENCIES: { value: MainCurrency; label: string }[] = [
  { value: "EUR", label: "EUR €" },
  { value: "USD", label: "USD $" },
  { value: "GBP", label: "GBP £" },
  { value: "CHF", label: "CHF ₣" },
];

const SECONDARY_CURRENCIES: SecondaryCurrency[] = ["USD","GBP","CHF","JPY","CAD","AUD"];

type AppliesTo = 'income' | 'expense' | 'both';

type TaxFormState = {
  name: string;
  rate: number;
  is_default: boolean;
  applies_to: AppliesTo;
  is_active: boolean;
};

const emptyTaxForm = (): TaxFormState => ({
  name: "", rate: 0, is_default: false, applies_to: "both", is_active: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: "pointer",
  };
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button"
      onClick={() => onChange(!checked)}
      style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: checked ? GOLD : "#d1d5db", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
    >
      <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left 0.2s", display: "block" }} />
    </button>
  );
}

function PillOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
        border: selected ? `1px solid ${GOLD}` : "1px solid #e5e7eb",
        background: selected ? `${GOLD}18` : "transparent",
        color: selected ? GOLD : TEXT_SECONDARY,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CurrencyTax() {
  // Currency singleton
  const { data: currencyData, loading: currencyLoading, upsert: upsertCurrency } = useCurrencySettings();

  // Local mirror of currency form fields
  const [mainCurrency, setMainCurrency] = useState<MainCurrency>("EUR");
  const [symbolPosition, setSymbolPosition] = useState<SymbolPosition>("before");
  const [decimalSeparator, setDecimalSeparator] = useState<"," | ".">(".");
  const [secondaryCurrencies, setSecondaryCurrencies] = useState<SecondaryCurrency[]>([]);
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Sync form from loaded data
  useEffect(() => {
    if (!currencyData) return;
    setMainCurrency((currencyData.primary_currency as MainCurrency) ?? "EUR");
    setSymbolPosition(currencyData.symbol_position ?? "before");
    setDecimalSeparator(currencyData.decimal_separator ?? ".");
    setSecondaryCurrencies((currencyData.secondary_currencies ?? []) as SecondaryCurrency[]);
  }, [currencyData]);

  // Tax rates list
  const { data: rates, loading: ratesLoading, create: createTax, update: updateTax, remove: removeTax } = useTaxRates();

  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxEditingId, setTaxEditingId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState<TaxFormState>(emptyTaxForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingTax, setSavingTax] = useState(false);

  function toggleSecondaryCurrency(c: SecondaryCurrency) {
    setSecondaryCurrencies(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  }

  async function saveCurrencySettings() {
    setSavingCurrency(true);
    const { error } = await upsertCurrency({
      primary_currency: mainCurrency,
      symbol_position: symbolPosition,
      decimal_separator: decimalSeparator,
      thousands_sep: decimalSeparator === "." ? "," : ".",
      secondary_currencies: secondaryCurrencies,
    });
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
    else { toast({ title: "Impostazioni valuta salvate" }); }
    setSavingCurrency(false);
  }

  // Tax modal
  function openCreateTax() {
    setTaxEditingId(null);
    setTaxForm(emptyTaxForm());
    setTaxModalOpen(true);
  }

  function openEditTax(r: TaxRate) {
    setTaxEditingId(r.id);
    setTaxForm({ name: r.name, rate: r.rate, is_default: r.is_default, applies_to: r.applies_to, is_active: r.is_active });
    setTaxModalOpen(true);
  }

  async function saveTaxModal() {
    if (!taxForm.name.trim()) return;
    setSavingTax(true);
    if (taxEditingId) {
      // If setting as default, clear default on all others first
      if (taxForm.is_default) {
        for (const r of rates) {
          if (r.id !== taxEditingId && r.is_default) {
            await updateTax(r.id, { is_default: false });
          }
        }
      }
      const { error } = await updateTax(taxEditingId, {
        name: taxForm.name,
        rate: taxForm.rate,
        is_default: taxForm.is_default,
        applies_to: taxForm.applies_to,
        is_active: taxForm.is_active,
      });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Aliquota aggiornata" }); }
    } else {
      if (taxForm.is_default) {
        for (const r of rates) {
          if (r.is_default) {
            await updateTax(r.id, { is_default: false });
          }
        }
      }
      const { error } = await createTax({
        name: taxForm.name,
        rate: taxForm.rate,
        is_default: taxForm.is_default,
        applies_to: taxForm.applies_to,
        is_active: taxForm.is_active,
      });
      if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
      else { toast({ title: "Aliquota creata" }); }
    }
    setSavingTax(false);
    setTaxModalOpen(false);
  }

  async function deleteTax(id: string) {
    const { error } = await removeTax(id);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); }
    else { toast({ title: "Aliquota eliminata" }); }
    setDeleteConfirm(null);
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Valute &amp; Tasse
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Configura valute, formati e aliquote IVA
        </p>
      </div>

      {/* ── SECTION 1: Currency ── */}
      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Impostazioni Valuta
          </h3>
        </div>

        {currencyLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: TEXT_MUTED, padding: "20px 0" }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Caricamento...</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Main currency */}
            <label style={labelStyle}>
              <span style={labelText}>Valuta principale</span>
              <select className="glass-input" value={mainCurrency} onChange={e => setMainCurrency(e.target.value as MainCurrency)}
                style={{ maxWidth: 200 }}>
                {MAIN_CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>

            {/* Number format */}
            <div style={labelStyle}>
              <span style={labelText}>Formato numero</span>
              <div style={{ display: "flex", gap: 8 }}>
                <PillOption label="1.000,00" selected={decimalSeparator === ","} onClick={() => setDecimalSeparator(",")} />
                <PillOption label="1,000.00" selected={decimalSeparator === "."} onClick={() => setDecimalSeparator(".")} />
              </div>
            </div>

            {/* Symbol position */}
            <div style={labelStyle}>
              <span style={labelText}>Posizione simbolo</span>
              <div style={{ display: "flex", gap: 8 }}>
                <PillOption label="€ 100" selected={symbolPosition === "before"} onClick={() => setSymbolPosition("before")} />
                <PillOption label="100 €" selected={symbolPosition === "after"} onClick={() => setSymbolPosition("after")} />
              </div>
            </div>

            {/* Secondary currencies */}
            <div style={labelStyle}>
              <span style={labelText}>Valute secondarie</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SECONDARY_CURRENCIES.map(c => {
                  const selected = secondaryCurrencies.includes(c);
                  return (
                    <button type="button"
                      key={c}
                      onClick={() => toggleSecondaryCurrency(c)}
                      style={{
                        padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                        border: selected ? `1px solid ${GOLD}` : "1px solid #e5e7eb",
                        background: selected ? `${GOLD}18` : "transparent",
                        color: selected ? GOLD : TEXT_SECONDARY,
                        transition: "all 0.15s",
                      }}
                    >
                      {selected && <Check size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />}
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="glass-btn-primary" onClick={saveCurrencySettings} disabled={savingCurrency}
            style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {savingCurrency && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Salva impostazioni
          </button>
        </div>
      </div>

      {/* ── SECTION 2: VAT Rates ── */}
      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
            Aliquote IVA
          </h3>
          <button type="button" className="glass-btn-primary" onClick={openCreateTax} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} /> Nuova Aliquota
          </button>
        </div>

        {ratesLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 0", gap: 10, color: TEXT_MUTED }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Caricamento...</span>
          </div>
        ) : rates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: TEXT_MUTED }}>
            <p style={{ fontSize: 13 }}>Nessuna aliquota. Aggiungine una.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rates.map((r, idx) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: idx < rates.length - 1 ? `0.5px solid ${BORDER}` : "none",
                  opacity: r.is_active ? 1 : 0.45,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{r.name}</span>
                    {r.is_default && (
                      <span style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 99,
                        background: `${GOLD}20`, color: GOLD, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", gap: 3,
                      }}>
                        <Star size={9} /> Default
                      </span>
                    )}
                    <span style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 99,
                      background: "#f3f4f6", color: TEXT_SECONDARY, fontWeight: 500,
                    }}>
                      {r.applies_to}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY }}>{r.rate}%</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {deleteConfirm === r.id ? (
                    <>
                      <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: 4 }}>Sei sicuro?</span>
                      <button type="button" onClick={() => deleteTax(r.id)} style={iconBtnStyle("#4ADE80")}><Check size={13} /></button>
                      <button type="button" onClick={() => setDeleteConfirm(null)} style={iconBtnStyle("#EF4444")}><X size={13} /></button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => openEditTax(r)} style={iconBtnStyle(GOLD)}><Pencil size={13} /></button>
                      <button type="button" onClick={() => setDeleteConfirm(r.id)} style={iconBtnStyle("#EF4444")}><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Tax modal */}
      <AnimatePresence>
        {taxModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,11,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => { if (e.target === e.currentTarget) setTaxModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ background: "#ffffff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: "24px 28px", minWidth: 440, maxWidth: 520, width: "100%" }}
            >
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 20, marginTop: 0 }}>
                {taxEditingId ? "Modifica Aliquota" : "Nuova Aliquota IVA"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={labelStyle}>
                  <span style={labelText}>Nome</span>
                  <input className="glass-input" value={taxForm.name} onChange={e => setTaxForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Standard" />
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Percentuale</span>
                  <div style={{ position: "relative" }}>
                    <input className="glass-input" type="number" min={0} max={100} value={taxForm.rate}
                      onChange={e => setTaxForm(f => ({ ...f, rate: Number(e.target.value) }))}
                      style={{ paddingRight: 28 }} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, fontSize: 13 }}>%</span>
                  </div>
                </label>
                <label style={labelStyle}>
                  <span style={labelText}>Applicabile a</span>
                  <select className="glass-input" value={taxForm.applies_to} onChange={e => setTaxForm(f => ({ ...f, applies_to: e.target.value as AppliesTo }))}>
                    <option value="both">Entrate &amp; Uscite</option>
                    <option value="income">Solo Entrate</option>
                    <option value="expense">Solo Uscite</option>
                  </select>
                </label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Aliquota predefinita</span>
                  <ToggleSwitch checked={taxForm.is_default} onChange={v => setTaxForm(f => ({ ...f, is_default: v }))} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: TEXT_SECONDARY }}>Attiva</span>
                  <ToggleSwitch checked={taxForm.is_active} onChange={v => setTaxForm(f => ({ ...f, is_active: v }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
                <button type="button" className="glass-btn" onClick={() => setTaxModalOpen(false)} disabled={savingTax}>Annulla</button>
                <button type="button" className="glass-btn-primary" onClick={saveTaxModal} disabled={!taxForm.name.trim() || savingTax}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {savingTax && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
                  Salva
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
