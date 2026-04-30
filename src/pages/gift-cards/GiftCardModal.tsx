import { useState, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Search, Upload, ImageIcon } from "lucide-react";
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

const INPUT = {
  padding: "10px 12px", borderRadius: 10, background: "var(--btn-glass-bg, rgba(255,255,255,0.05))",
  border: "1px solid var(--btn-glass-border, rgba(255,255,255,0.1))", color: "var(--text-primary)", fontSize: 13, outline: "none", width: "100%", colorScheme: "dark",
} as const;

const LABEL = { fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)", marginBottom: 5, display: "block" } as const;

export function GiftCardModal({ brands, editingCard, onSave, onClose }: GiftCardModalProps) {
  const isEdit = !!editingCard;
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [selectedBrand, setSelectedBrand] = useState<GiftCardBrand | null>(
    isEdit ? (brands.find((b) => b.brand_key === editingCard.brand_key) ?? null) : null,
  );
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Custom brand state
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customColor, setCustomColor] = useState("#e8ff00");
  const [customCategory, setCustomCategory] = useState<GiftCardCategory>("other");
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [customImageName, setCustomImageName] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Step 2 form state
  const [value, setValue] = useState(isEdit ? String(editingCard.initial_value) : "");
  const [remaining, setRemaining] = useState(isEdit ? String(editingCard.remaining_value) : "");
  const [currency, setCurrency] = useState<GiftCardCurrency>(isEdit ? editingCard.currency : (selectedBrand?.default_currency ?? "EUR") as GiftCardCurrency);
  const [notes, setNotes] = useState(isEdit ? editingCard.notes ?? "" : "");
  const [remainingTouched, setRemainingTouched] = useState(false);

  const popularBrands = useMemo(() => brands.filter((b) => b.is_popular), [brands]);
  const filteredBrands = useMemo(() => {
    if (!search) return brands;
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);
  const brandsByCategory = useMemo(() => {
    const map: Record<string, GiftCardBrand[]> = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const b of brands) (map[b.category] ??= []).push(b);
    return map;
  }, [brands]);

  function selectBrand(brand: GiftCardBrand) {
    setSelectedBrand(brand);
    setCurrency(brand.default_currency as GiftCardCurrency);
    setStep(2);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  function confirmCustomBrand() {
    if (!customName.trim()) return;
    const key = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const custom: GiftCardBrand = {
      brand_key: `custom_${key}_${Date.now()}`,
      name: customName.trim(),
      logo_url: customImageUrl ?? null,
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

  function handleValueChange(v: string) {
    setValue(v);
    if (!remainingTouched) setRemaining(v);
  }

  async function handleSubmit() {
    const numValue = parseFloat(value);
    const numRemaining = remaining !== "" ? parseFloat(remaining) : numValue;
    if (!numValue || numValue <= 0) { setError("Il valore deve essere maggiore di 0"); return; }
    if (isNaN(numRemaining) || numRemaining < 0 || numRemaining > numValue) {
      setError("Il saldo deve essere tra 0 e il valore iniziale");
      return;
    }
    if (!selectedBrand) return;

    setSaving(true);
    setError("");
    try {
      await onSave({
        brand: selectedBrand.name,
        brand_key: selectedBrand.brand_key,
        initial_value: numValue,
        remaining_value: numRemaining,
        currency,
        notes: notes.trim() || undefined,
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
        style={{ background: "var(--glass-bg-elevated, #1a1a1a)", border: "1px solid var(--glass-border)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "88vh", overflow: "auto", position: "relative", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>

        <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#999", cursor: "pointer", zIndex: 10 }}>
          <X style={{ width: 18, height: 18 }} />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111", marginBottom: 16 }}>Seleziona Brand</h3>

              {/* Search */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "var(--btn-glass-bg)", border: "1px solid var(--btn-glass-border)", marginBottom: 20 }}>
                <Search style={{ width: 14, height: 14, color: "var(--text-quaternary)", flexShrink: 0 }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca brand..."
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#111" }} />
              </div>

              {search ? (
                <div>
                  {filteredBrands.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <p style={{ fontSize: 13, color: "var(--text-quaternary)", marginBottom: 12 }}>Nessun brand trovato</p>
                      <button type="button" onClick={() => { setCustomMode(true); setCustomName(search); }}
                        style={{ fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-primary)", cursor: "pointer" }}>
                        + Aggiungi "{search}" come brand personalizzato
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
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Più usati</p>
                    <BrandGrid brands={popularBrands} onSelect={selectBrand} />
                  </div>

                  {/* By Category */}
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 8 }}>Per categoria</p>
                  {CATEGORIES.map((cat) => {
                    const catBrands = brandsByCategory[cat] ?? [];
                    if (catBrands.length === 0) return null;
                    const isExpanded = expandedCat === cat;
                    return (
                      <div key={cat} style={{ marginBottom: 2 }}>
                        <button type="button" onClick={() => setExpandedCat(isExpanded ? null : cat)}
                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-primary)", transition: "background 0.1s" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 14 }}>{getCategoryEmoji(cat)}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{getCategoryLabel(cat)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11, color: "var(--text-quaternary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{catBrands.map((b) => b.name).join(", ")}</span>
                            <ChevronRight style={{ width: 12, height: 12, transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
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
                  <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 16, paddingTop: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#999", textTransform: "uppercase", marginBottom: 10 }}>Personalizzata</p>
                    {customMode ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Image upload */}
                        <div>
                          <label style={LABEL}>Immagine / Logo</label>
                          <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              onClick={() => imageInputRef.current?.click()}
                              style={{
                                width: 56, height: 56, borderRadius: 12, border: "2px dashed rgba(255,255,255,0.15)",
                                background: customImageUrl ? "transparent" : "var(--btn-glass-bg)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", overflow: "hidden", flexShrink: 0, transition: "border-color 0.15s",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; }}>
                              {customImageUrl ? (
                                <img src={customImageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <ImageIcon style={{ width: 20, height: 20, color: "var(--text-quaternary)" }} />
                              )}
                            </div>
                            <div>
                              <button type="button" onClick={() => imageInputRef.current?.click()}
                                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>
                                <Upload style={{ width: 12, height: 12 }} />
                                {customImageUrl ? "Cambia immagine" : "Carica immagine"}
                              </button>
                              {customImageName && <p style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{customImageName}</p>}
                              {customImageUrl && (
                                <button type="button" onClick={() => { setCustomImageUrl(null); setCustomImageName(""); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                                  style={{ fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
                                  Rimuovi
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Name */}
                        <div>
                          <label style={LABEL}>Nome brand *</label>
                          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Es. Esselunga, Conad..."
                            style={INPUT} />
                        </div>

                        {/* Color + Category */}
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                          <div style={{ flex: 1 }}>
                            <label style={LABEL}>Colore carta</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
                                style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid #e5e5e5", cursor: "pointer", padding: 2 }} />
                              <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontFamily: "monospace" }}>{customColor}</span>
                            </div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={LABEL}>Categoria</label>
                            <select value={customCategory} onChange={(e) => setCustomCategory(e.target.value as GiftCardCategory)}
                              style={{ ...INPUT, cursor: "pointer" }}>
                              {CATEGORIES.map((c) => <option key={c} value={c}>{getCategoryEmoji(c)} {getCategoryLabel(c)}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-1">
                          <button type="button" onClick={() => setCustomMode(false)}
                            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                            Annulla
                          </button>
                          <button type="button" onClick={confirmCustomBrand} disabled={!customName.trim()}
                            style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "var(--btn-glass-bg)", color: "var(--text-primary)", fontSize: 12, fontWeight: 700, cursor: customName.trim() ? "pointer" : "not-allowed", opacity: customName.trim() ? 1 : 0.5 }}>
                            Conferma
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setCustomMode(true)}
                        style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1.5px dashed rgba(255,255,255,0.15)", background: "transparent", color: "var(--text-quaternary)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "border-color 0.15s, color 0.15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLElement).style.color = "var(--text-quaternary)"; }}>
                        <ImageIcon style={{ width: 14, height: 14 }} />
                        + Brand personalizzato con immagine
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ padding: 24 }}>

              {!isEdit && (
                <button type="button" onClick={() => setStep(1)}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, fontWeight: 500, marginBottom: 12 }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Indietro
                </button>
              )}

              {/* Brand header */}
              {selectedBrand && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)", marginBottom: 22 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: selectedBrand.logo_url ? "#fff" : (selectedBrand.color ?? "#6b7280"), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, border: "1px solid var(--glass-border)" }}>
                    {selectedBrand.logo_url ? (
                      <img src={selectedBrand.logo_url} alt="" style={{ width: 32, height: 32, objectFit: "contain" }} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{selectedBrand.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{selectedBrand.name} Gift Card</p>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>{getCategoryEmoji(selectedBrand.category as GiftCardCategory)} {getCategoryLabel(selectedBrand.category as GiftCardCategory)}</p>
                  </div>
                </div>
              )}

              {/* Value + Currency */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={LABEL}>Valore iniziale *</label>
                  <input type="number" value={value} onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="0.00" min="0" step="0.01" autoFocus
                    style={{ ...INPUT, fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 15 }} />
                </div>
                <div>
                  <label style={LABEL}>Valuta</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as GiftCardCurrency)}
                    style={{ ...INPUT, cursor: "pointer", fontWeight: 600 }}>
                    {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Remaining balance — only show when different from initial */}
              <div style={{ marginBottom: 14 }}>
                <label style={LABEL}>Saldo attuale <span style={{ fontWeight: 400, color: "#aaa" }}>(lascia uguale se carta nuova)</span></label>
                <input type="number" value={remaining} min="0" step="0.01"
                  onChange={(e) => { setRemaining(e.target.value); setRemainingTouched(true); }}
                  placeholder={value || "0.00"}
                  style={{ ...INPUT, fontVariantNumeric: "tabular-nums" }} />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}>Note</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dove hai comprato, come usarla..."
                  rows={2}
                  style={{ ...INPUT, resize: "none", fontFamily: "inherit", lineHeight: 1.5 } as any} />
              </div>

              {/* Error */}
              {error && (
                <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16 }}>{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  Annulla
                </button>
                <button type="button" onClick={handleSubmit} disabled={saving}
                  style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Salvataggio..." : isEdit ? "Salva modifiche" : "Aggiungi Gift Card"}
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
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 4px", borderRadius: 12, border: "1px solid var(--glass-border)", background: "var(--btn-glass-bg)", cursor: "pointer", transition: "all 0.15s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)"; (e.currentTarget as HTMLElement).style.background = "var(--btn-glass-bg)"; }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: brand.logo_url ? "#fff" : (brand.color ?? "#6b7280"), display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: brand.logo_url ? "1px solid var(--glass-border)" : "none" }}>
            {brand.logo_url ? (
              <img src={brand.logo_url} alt="" style={{ width: 28, height: 28, objectFit: "contain" }} loading="lazy" />
            ) : (
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{brand.name.charAt(0)}</span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{brand.name}</span>
        </button>
      ))}
    </div>
  );
}
