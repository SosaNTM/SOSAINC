import { useState, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Eye, EyeOff, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GiftCardBrand, EnrichedGiftCard, GiftCardCurrency, GiftCardCategory } from "@/portals/finance/types/giftCards";
import { getCategoryLabel, getCategoryEmoji } from "@/portals/finance/utils/giftCardUtils";

interface GiftCardModalProps {
  brands: GiftCardBrand[];
  editingCard: EnrichedGiftCard | null;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES: GiftCardCategory[] = ["shopping", "entertainment", "gaming", "food", "travel", "other"];
const CURRENCY_OPTIONS: GiftCardCurrency[] = ["EUR", "USD", "GBP"];

export function GiftCardModal({ brands, editingCard, onSave, onClose }: GiftCardModalProps) {
  const isEdit = !!editingCard;
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [selectedBrand, setSelectedBrand] = useState<GiftCardBrand | null>(
    isEdit ? (brands.find((b) => b.brand_key === editingCard.brand_key) ?? null) : null,
  );
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState("#c9a96e");
  const [customCategory, setCustomCategory] = useState<GiftCardCategory>("other");
  const [saving, setSaving] = useState(false);

  // Step 2 form state
  const [value, setValue] = useState(isEdit ? String(editingCard.initial_value) : "");
  const [remaining, setRemaining] = useState(isEdit ? String(editingCard.remaining_value) : "");
  const [currency, setCurrency] = useState<GiftCardCurrency>(isEdit ? editingCard.currency : (selectedBrand?.default_currency ?? "EUR") as GiftCardCurrency);
  const [cardCode, setCardCode] = useState(isEdit ? editingCard.card_code ?? "" : "");
  const [pin, setPin] = useState(isEdit ? editingCard.pin ?? "" : "");
  const [purchaseDate, setPurchaseDate] = useState(isEdit ? editingCard.purchase_date ?? "" : new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState(isEdit ? editingCard.expiry_date ?? "" : "");
  const [notes, setNotes] = useState(isEdit ? editingCard.notes ?? "" : "");
  const [showCode, setShowCode] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const popularBrands = useMemo(() => brands.filter((b) => b.is_popular), [brands]);
  const filteredBrands = useMemo(() => {
    if (!search) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);
  const brandsByCategory = useMemo(() => {
    const map: Record<string, GiftCardBrand[]> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const b of brands) {
      (map[b.category] ??= []).push(b);
    }
    return map;
  }, [brands]);

  function selectBrand(brand: GiftCardBrand) {
    setSelectedBrand(brand);
    setCurrency(brand.default_currency as GiftCardCurrency);
    setStep(2);
  }

  function confirmCustomBrand() {
    if (!customName.trim()) return;
    const key = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const custom: GiftCardBrand = {
      brand_key: `custom_${key}`,
      name: customName.trim(),
      logo_url: null,
      color: customColor,
      category: customCategory,
      default_currency: "EUR",
      has_expiry: false,
      is_popular: false,
    };
    setSelectedBrand(custom);
    setCurrency("EUR");
    setCustomMode(false);
    setStep(2);
  }

  async function handleSubmit() {
    const numValue = parseFloat(value);
    const numRemaining = remaining ? parseFloat(remaining) : numValue;
    if (!numValue || numValue <= 0) { setError("Il valore deve essere maggiore di 0"); return; }
    if (numRemaining < 0 || numRemaining > numValue) { setError("Il saldo deve essere tra 0 e il valore iniziale"); return; }

    const brand = selectedBrand;
    if (!brand) return;

    setSaving(true);
    setError("");
    try {
      await onSave({
        brand: brand.name,
        brand_key: brand.brand_key,
        initial_value: numValue,
        remaining_value: numRemaining,
        currency,
        card_code: cardCode || undefined,
        pin: pin || undefined,
        purchase_date: purchaseDate || undefined,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "85vh", overflow: "auto", position: "relative", boxShadow: "0 24px 48px rgba(0,0,0,0.15)" }}>

        {/* Close */}
        <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#999", cursor: "pointer", zIndex: 10 }}>
          <X style={{ width: 18, height: 18 }} />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 16 }}>Seleziona Brand</h3>

              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#f5f5f5", border: "1px solid #e5e5e5", marginBottom: 20 }}>
                <Search style={{ width: 14, height: 14, color: "#999" }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca brand..."
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#111" }} />
              </div>

              {search ? (
                <div>
                  {filteredBrands.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <p style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>Nessun brand trovato</p>
                      <button type="button" onClick={() => { setCustomMode(true); setCustomName(search); }}
                        style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "1px solid #c9a96e", background: "transparent", color: "#c9a96e", cursor: "pointer" }}>
                        + Aggiungi "{search}" come brand custom
                      </button>
                    </div>
                  ) : (
                    <BrandGrid brands={filteredBrands} onSelect={selectBrand} />
                  )}
                </div>
              ) : (
                <>
                  {/* Popular */}
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Popolari</p>
                    <BrandGrid brands={popularBrands} onSelect={selectBrand} />
                  </div>

                  {/* By Category */}
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>Per Categoria</p>
                  {CATEGORIES.map((cat) => {
                    const catBrands = brandsByCategory[cat] ?? [];
                    if (catBrands.length === 0) return null;
                    const isExpanded = expandedCat === cat;
                    return (
                      <div key={cat} style={{ marginBottom: 2 }}>
                        <button type="button" onClick={() => setExpandedCat(isExpanded ? null : cat)}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", color: "#333", transition: "background 0.1s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f5f5f5"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14 }}>{getCategoryEmoji(cat)}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{getCategoryLabel(cat)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11, color: "#aaa", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{catBrands.map((b) => b.name).join(", ")}</span>
                            {isExpanded ? <ChevronRight style={{ width: 12, height: 12, transform: "rotate(90deg)", transition: "transform 0.2s" }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}
                          </div>
                        </button>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.2 }} style={{ padding: "8px 0 8px 12px" }}>
                            <BrandGrid brands={catBrands} onSelect={selectBrand} />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}

                  {/* Custom brand */}
                  <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 16 }}>
                    {customMode ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Nome brand *"
                          style={{ padding: "10px 12px", borderRadius: 8, background: "#f5f5f5", border: "1px solid #e5e5e5", color: "#111", fontSize: 13, outline: "none" }} />
                        <div className="flex items-center gap-3">
                          <label style={{ fontSize: 12, color: "#666" }}>Colore:</label>
                          <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
                            style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #e5e5e5", cursor: "pointer" }} />
                          <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as GiftCardCategory)}
                            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "#f5f5f5", border: "1px solid #e5e5e5", color: "#333" }}>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setCustomMode(false)}
                            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #e5e5e5", background: "transparent", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            Annulla
                          </button>
                          <button type="button" onClick={confirmCustomBrand}
                            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            Conferma
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setCustomMode(true)}
                        style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1px solid #ddd", background: "transparent", color: "#666", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        + Aggiungi Brand Custom
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: 24 }}>
              {/* Back button (only on add) */}
              {!isEdit && (
                <button type="button" onClick={() => setStep(1)}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, fontWeight: 500, marginBottom: 12 }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Indietro
                </button>
              )}

              {/* Brand header */}
              {selectedBrand && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#f7f7f7", border: "1px solid #eee", marginBottom: 20 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: selectedBrand.logo_url ? "#fff" : (selectedBrand.color ?? "#6b7280"), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {selectedBrand.logo_url ? (
                      <img src={selectedBrand.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{selectedBrand.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>{selectedBrand.name} Gift Card</p>
                  </div>
                </div>
              )}

              {/* Value + Currency */}
              <label style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, display: "block" }}>Quanto hai sulla card? *</label>
              <div className="flex gap-2 mb-6">
                <input type="number" value={value} onChange={(e) => { setValue(e.target.value); setRemaining(e.target.value); }} placeholder="0.00" min="0" step="0.01"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "#f5f5f5", border: "1px solid #e5e5e5", color: "#111", fontSize: 14, fontWeight: 600, outline: "none", fontVariantNumeric: "tabular-nums" }}
                  autoFocus />
                <select value={currency} onChange={(e) => setCurrency(e.target.value as GiftCardCurrency)}
                  style={{ padding: "10px 12px", borderRadius: 10, background: "#f5f5f5", border: "1px solid #e5e5e5", color: "#111", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16 }}>{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e5e5e5", background: "transparent", color: "#666", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Annulla
                </button>
                <button type="button" onClick={handleSubmit} disabled={saving}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Salvataggio..." : isEdit ? "Salva Modifiche" : "Aggiungi Gift Card"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Brand Grid ────────────────────────────────────────────────────────────── */

function BrandGrid({ brands, onSelect }: { brands: GiftCardBrand[]; onSelect: (b: GiftCardBrand) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
      {brands.map((brand) => (
        <button key={brand.brand_key} type="button" onClick={() => onSelect(brand)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", borderRadius: 12, border: "1px solid #eee", background: "#fafafa", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#c9a96e"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#eee"; (e.currentTarget as HTMLElement).style.background = "#fafafa"; }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: brand.logo_url ? "#fff" : (brand.color ?? "#6b7280"), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {brand.logo_url ? (
              <img src={brand.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} loading="lazy" />
            ) : (
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{brand.name.charAt(0)}</span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#555", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{brand.name}</span>
        </button>
      ))}
    </div>
  );
}
