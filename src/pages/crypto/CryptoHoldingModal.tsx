import { useState, useEffect } from "react";
import { X, ArrowLeft, Search, ChevronDown } from "lucide-react";
import type { CoinOption, CryptoPrice, EnrichedHolding } from "@/portals/finance/types/crypto";
import { useCoinSelector } from "@/portals/finance/hooks/useCoinSelector";
import { formatEUR } from "@/portals/finance/utils/currency";

const GOLD = "#c9a96e";
const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
  background: "var(--btn-glass-bg)", border: "0.5px solid var(--btn-glass-border)",
  color: "var(--text-primary)", outline: "none", transition: "border-color 0.15s",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: { coin_id: string; symbol: string; name: string; quantity: number; avg_buy_price_eur?: number; notes?: string }) => Promise<void>;
  editing: EnrichedHolding | null;
  existingCoinIds: string[];
  getPriceForCoin: (coinId: string) => CryptoPrice | null;
  saveError?: string | null;
}

export function CryptoHoldingModal({ open, onClose, onSave, editing, existingCoinIds, getPriceForCoin, saveError }: Props) {
  const { coins, isSearching, searchQuery, setSearchQuery, resetSearch } = useCoinSelector({ existingCoinIds });

  // Step: "select" | "details"
  const [step, setStep] = useState<"select" | "details">("select");
  const [selectedCoin, setSelectedCoin] = useState<CoinOption | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Form fields
  const [quantity, setQuantity] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      if (editing) {
        setStep("details");
        setSelectedCoin({
          coin_id: editing.coin_id,
          symbol: editing.symbol,
          name: editing.name,
          image_url: editing.imageUrl,
          price_eur: editing.currentPrice,
          price_change_24h: editing.priceChange24h,
        });
        setQuantity(String(editing.quantity));
        setAvgBuyPrice(editing.avg_buy_price_eur != null ? String(editing.avg_buy_price_eur) : "");
        setNotes(editing.notes ?? "");
      } else {
        setStep("select");
        setSelectedCoin(null);
        resetSearch();
        setShowAll(false);
        setQuantity("");
        setAvgBuyPrice("");
        setNotes("");
      }
    }
  }, [open, editing, resetSearch]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function selectCoin(coin: CoinOption & { alreadyOwned?: boolean }) {
    if (coin.alreadyOwned) return;
    setSelectedCoin(coin);
    setStep("details");
  }

  function goBack() {
    setStep("select");
    setSelectedCoin(null);
  }

  // Live calculations
  const priceData = selectedCoin ? getPriceForCoin(selectedCoin.coin_id) : null;
  const currentPrice = priceData?.price_eur ?? selectedCoin?.price_eur ?? 0;
  const change24h = priceData?.price_change_24h ?? selectedCoin?.price_change_24h ?? 0;
  const qty = parseFloat(quantity) || 0;
  const buyP = parseFloat(avgBuyPrice) || 0;
  const liveValue = qty * currentPrice;
  const livePL = buyP > 0 ? (currentPrice - buyP) * qty : null;
  const livePLPct = buyP > 0 ? ((currentPrice - buyP) / buyP) * 100 : null;

  const isValid = qty > 0;

  async function handleSubmit() {
    if (!isValid || !selectedCoin || saving) return;
    setSaving(true);
    try {
      await onSave({
        coin_id: selectedCoin.coin_id,
        symbol: selectedCoin.symbol,
        name: selectedCoin.name,
        quantity: qty,
        avg_buy_price_eur: buyP > 0 ? buyP : undefined,
        notes: notes.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  // Coins to display (first 12 or all)
  const displayCoins = searchQuery.length > 0 ? coins : (showAll ? coins : coins.slice(0, 12));

  const modal = (
    <>
      <div className="fixed inset-0 z-50 glass-modal-overlay" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[520px] glass-modal"
        style={{ animation: "fadeInUp 0.2s ease-out", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          {step === "details" && !editing ? (
            <button type="button" onClick={goBack} className="flex items-center gap-1"
              style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              <ArrowLeft style={{ width: 14, height: 14 }} /> Indietro
            </button>
          ) : <span />}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            {editing ? "Modifica Holding" : step === "select" ? "Seleziona Crypto" : "Aggiungi al Portfolio"}
          </h2>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--btn-glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <X style={{ width: 14, height: 14, color: "var(--text-secondary)", strokeWidth: 1.7 }} />
          </button>
        </div>

        {/* ── Step 1: Select Crypto ─────────────────────────────────── */}
        {step === "select" && (
          <>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-quaternary)" }} />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cerca per nome o simbolo..."
                style={{ ...INPUT_STYLE, paddingLeft: 34 }} autoFocus
                onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--btn-glass-border)"; }} />
            </div>

            {searchQuery.length === 0 && (
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>PRINCIPALI</p>
            )}

            {isSearching && (
              <p style={{ fontSize: 12, color: "var(--text-quaternary)", textAlign: "center", padding: 16 }}>Ricerca...</p>
            )}

            {/* Coin Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2" style={{ maxHeight: 380, overflowY: "auto" }}>
              {!isSearching && displayCoins.map((coin) => {
                const owned = "alreadyOwned" in coin && coin.alreadyOwned;
                const up = (coin.price_change_24h ?? 0) >= 0;
                return (
                  <button key={coin.coin_id} type="button" onClick={() => selectCoin(coin)}
                    disabled={owned}
                    style={{
                      padding: "12px 8px", borderRadius: 12, textAlign: "center", cursor: owned ? "not-allowed" : "pointer",
                      background: "var(--btn-glass-bg)", border: "0.5px solid var(--btn-glass-border)",
                      opacity: owned ? 0.4 : 1, transition: "all 0.15s", position: "relative",
                    }}
                    onMouseEnter={(e) => { if (!owned) { (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}80`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${GOLD}10`; } }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--btn-glass-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    {owned && (
                      <span style={{ position: "absolute", top: 4, right: 4, fontSize: 8, fontWeight: 700, color: GOLD, background: `${GOLD}20`, padding: "1px 5px", borderRadius: 4 }}>
                        Aggiunta
                      </span>
                    )}
                    {coin.image_url ? (
                      <img src={coin.image_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", margin: "0 auto 6px" }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${GOLD}30`, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: GOLD }}>
                        {coin.symbol.slice(0, 2)}
                      </div>
                    )}
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{coin.symbol}</p>
                    <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{coin.name}</p>
                    {coin.price_eur > 0 && (
                      <>
                        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)" }}>{formatEUR(coin.price_eur)}</p>
                        <p style={{ fontSize: 9, fontWeight: 600, color: up ? "#22c55e" : "#ef4444" }}>
                          {up ? "+" : ""}{(coin.price_change_24h ?? 0).toFixed(1)}%
                        </p>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Show more / hint */}
            {searchQuery.length === 0 && !showAll && coins.length > 12 && (
              <button type="button" onClick={() => setShowAll(true)}
                className="flex items-center justify-center gap-1 w-full mt-3"
                style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                <ChevronDown style={{ width: 12, height: 12 }} /> Mostra altre
              </button>
            )}
            {!isSearching && displayCoins.length === 0 && searchQuery.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--text-quaternary)", textAlign: "center", padding: 16 }}>Nessun risultato</p>
            )}
            {searchQuery.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--text-quaternary)", textAlign: "center", marginTop: 12 }}>
                Non trovi la tua crypto? Cercala sopra ↑
              </p>
            )}
          </>
        )}

        {/* ── Step 2: Details ─────────────────────────────────────── */}
        {step === "details" && selectedCoin && (
          <>
            {/* Coin info header */}
            <div className="flex items-center gap-3 mb-5" style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--glass-border)" }}>
              {(selectedCoin.image_url) && <img src={selectedCoin.image_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />}
              <div className="flex-1">
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{selectedCoin.name} ({selectedCoin.symbol})</p>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Prezzo attuale: {formatEUR(currentPrice)}
                  {change24h !== 0 && <span style={{ marginLeft: 8, color: change24h >= 0 ? "#22c55e" : "#ef4444", fontWeight: 600 }}>({change24h >= 0 ? "+" : ""}{change24h.toFixed(1)}%)</span>}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quanti ne possiedi? *</label>
            <div style={{ position: "relative" }}>
              <input type="number" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0.00000000"
                style={{ ...INPUT_STYLE, fontVariantNumeric: "tabular-nums", paddingRight: 50 }} autoFocus={step === "details" && !editing}
                onFocus={(e) => { e.currentTarget.style.borderColor = GOLD; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--btn-glass-border)"; }} />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 600, color: "var(--text-quaternary)" }}>
                {selectedCoin.symbol}
              </span>
            </div>
            {qty > 0 && (
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
                Valore attuale: <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{formatEUR(liveValue)}</span>
              </p>
            )}

            {/* Error */}
            {saveError && (
              <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {saveError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={onClose}
                className="glass-btn flex-1 py-3 text-sm font-semibold text-muted-foreground">
                Annulla
              </button>
              <button type="button" onClick={handleSubmit} disabled={!isValid || saving}
                className="glass-btn-primary flex-1 py-3 text-sm font-semibold" style={{ opacity: isValid && !saving ? 1 : 0.4 }}>
                {saving ? "Salvataggio..." : editing ? "Salva Modifiche" : "Aggiungi al Portfolio"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );

  return modal;
}
