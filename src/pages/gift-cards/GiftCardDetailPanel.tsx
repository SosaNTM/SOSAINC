import { useState } from "react";
import { X, Eye, EyeOff, Copy, Check, Trash2, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { EnrichedGiftCard, GiftCardTransaction } from "@/portals/finance/types/giftCards";
import { getStatusColor, getStatusLabel, getProgressColor } from "@/portals/finance/utils/giftCardUtils";

interface Props {
  card: EnrichedGiftCard;
  transactions: GiftCardTransaction[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onToggleFavorite: (fav: boolean) => void;
  onUseBalance: (amount: number, description?: string, date?: string) => Promise<void>;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onShowCode: () => void;
}

export function GiftCardDetailPanel({
  card, transactions, onClose, onEdit, onDelete, onArchive,
  onToggleFavorite, onUseBalance, onDeleteTransaction, onShowCode,
}: Props) {
  const [showCodeField, setShowCodeField] = useState(false);
  const [showPinField, setShowPinField] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [useBalanceOpen, setUseBalanceOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<string | null>(null);
  const [deleteConfirmCard, setDeleteConfirmCard] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  const brandColor = card.brandData?.color ?? "#6b7280";
  const remainPercent = card.initial_value > 0 ? (card.remaining_value / card.initial_value) * 100 : 0;
  const progressColor = getProgressColor(remainPercent);
  const isInactive = card.status === "fully_used" || card.status === "expired" || card.status === "archived";

  const numAmount = parseFloat(amount) || 0;
  const balanceAfter = Math.max(0, card.remaining_value - numAmount);
  const balanceAfterPercent = card.initial_value > 0 ? (balanceAfter / card.initial_value) * 100 : 0;

  async function copyText(text: string, type: "code" | "pin") {
    await navigator.clipboard.writeText(text);
    if (type === "code") { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
    else { setCopiedPin(true); setTimeout(() => setCopiedPin(false), 2000); }
  }

  async function handleUseBalance() {
    if (numAmount <= 0 || numAmount > card.remaining_value) return;
    setSaving(true);
    try {
      await onUseBalance(numAmount, description || undefined, txDate || undefined);
      setAmount("");
      setDescription("");
      setUseBalanceOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function useAll() {
    setAmount(String(card.remaining_value));
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.5)" }} />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 95,
          width: "min(420px, 100vw)", background: "#141414",
          borderLeft: "1px solid rgba(201,169,110,0.1)",
          overflow: "auto",
        }}>

        {/* Close */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px 0" }}>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-quaternary)", cursor: "pointer" }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: "0 20px 24px" }}>
          {/* Header */}
          <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: brandColor, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{card.brand.charAt(0)}</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{card.brand}</p>
            <p style={{ fontSize: 12, color: "var(--text-quaternary)", marginTop: 2 }}>Gift Card</p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <button type="button" onClick={() => onToggleFavorite(!card.is_favorite)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: card.is_favorite ? "#c9a96e" : "rgba(255,255,255,0.15)", fontWeight: 600 }}>
                ★ {card.is_favorite ? "Preferita" : "Preferita"}
              </button>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: 3, background: getStatusColor(card.status) }} />
                <span style={{ fontSize: 12, color: getStatusColor(card.status), fontWeight: 500 }}>{getStatusLabel(card.status)}</span>
              </div>
            </div>
          </div>

          {/* Balance Section */}
          <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)", marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 8 }}>SALDO</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
              €{card.remaining_value.toFixed(2)} <span style={{ fontSize: 14, color: "var(--text-quaternary)", fontWeight: 500 }}>/ €{card.initial_value.toFixed(2)}</span>
            </p>
            <div className="flex items-center gap-2 my-3">
              <div style={{ flex: 1, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, background: progressColor, width: `${remainPercent}%`, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: progressColor, fontVariantNumeric: "tabular-nums", minWidth: 40, textAlign: "right" }}>
                {remainPercent.toFixed(1)}%
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-quaternary)", textAlign: "center" }}>Usato: €{card.usedValue.toFixed(2)}</p>
          </div>

          {/* Use Balance Button */}
          {!isInactive && (
            <button type="button" onClick={() => setUseBalanceOpen(!useBalanceOpen)}
              style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: "#c9a96e", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              <CreditCard style={{ width: 16, height: 16 }} /> Usa Saldo
            </button>
          )}

          {/* Use Balance Form */}
          <AnimatePresence>
            {useBalanceOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden", marginBottom: 16 }}>
                <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Usa Saldo — {card.brand}</p>
                  <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 12 }}>Saldo disponibile: €{card.remaining_value.toFixed(2)}</p>

                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, display: "block" }}>Importo speso *</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="0" max={card.remaining_value} step="0.01"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)", fontSize: 14, fontWeight: 600, outline: "none", fontVariantNumeric: "tabular-nums", marginBottom: 4 }} />
                  {numAmount > 0 && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: getProgressColor(balanceAfterPercent), marginBottom: 8, fontVariantNumeric: "tabular-nums", transition: "color 0.2s" }}>
                      Saldo dopo: €{balanceAfter.toFixed(2)}
                    </p>
                  )}
                  {numAmount > card.remaining_value && (
                    <p style={{ fontSize: 11, color: "#ef4444", marginBottom: 8 }}>Importo superiore al saldo disponibile (€{card.remaining_value.toFixed(2)})</p>
                  )}

                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, display: "block" }}>Descrizione (opzionale)</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Ordine Amazon #123"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)", fontSize: 12, outline: "none", marginBottom: 12 }} />

                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 4, display: "block" }}>Data</label>
                  <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)", fontSize: 12, outline: "none", marginBottom: 12 }} />

                  <div className="flex gap-2">
                    <button type="button" onClick={useAll}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid rgba(201,169,110,0.3)", background: "transparent", color: "#c9a96e", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Usa Tutto (€{card.remaining_value.toFixed(2)})
                    </button>
                    <button type="button" onClick={handleUseBalance} disabled={saving || numAmount <= 0 || numAmount > card.remaining_value}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: "#c9a96e", color: "#000", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", opacity: (saving || numAmount <= 0 || numAmount > card.remaining_value) ? 0.5 : 1 }}>
                      {saving ? "..." : "Conferma Spesa"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Details */}
          <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 10 }}>DETTAGLI</p>
            <DetailRow label="Valuta" value={card.currency} />
            <DetailRow label="Acquisto" value={card.purchase_date ? new Date(card.purchase_date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
            <DetailRow label="Scadenza" value={
              card.isExpired ? `Scaduta` :
              card.isExpiringSoon ? `⚠️ Tra ${card.daysUntilExpiry}gg` :
              card.expiry_date ? new Date(card.expiry_date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "—"
            } color={card.isExpired || card.isExpiringSoon ? "#ef4444" : undefined} />

            {card.card_code && (
              <div className="flex items-center justify-between py-2">
                <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Codice</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "DM Mono, monospace" }}>
                    {showCodeField ? card.card_code : "•••• •••• ••••"}
                  </span>
                  <button type="button" onClick={() => setShowCodeField(!showCodeField)} style={{ background: "none", border: "none", color: "var(--text-quaternary)", cursor: "pointer" }}>
                    {showCodeField ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
                  </button>
                  <button type="button" onClick={() => copyText(card.card_code!, "code")} style={{ background: "none", border: "none", color: copiedCode ? "#4ade80" : "var(--text-quaternary)", cursor: "pointer" }}>
                    {copiedCode ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  </button>
                </div>
              </div>
            )}

            {card.pin && (
              <div className="flex items-center justify-between py-2">
                <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>PIN</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "DM Mono, monospace" }}>
                    {showPinField ? card.pin : "••••"}
                  </span>
                  <button type="button" onClick={() => setShowPinField(!showPinField)} style={{ background: "none", border: "none", color: "var(--text-quaternary)", cursor: "pointer" }}>
                    {showPinField ? <EyeOff style={{ width: 12, height: 12 }} /> : <Eye style={{ width: 12, height: 12 }} />}
                  </button>
                  <button type="button" onClick={() => copyText(card.pin!, "pin")} style={{ background: "none", border: "none", color: copiedPin ? "#4ade80" : "var(--text-quaternary)", cursor: "pointer" }}>
                    {copiedPin ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                  </button>
                </div>
              </div>
            )}

            {card.notes && <DetailRow label="Note" value={card.notes} />}
          </div>

          {/* Transaction History */}
          <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 16, marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 10 }}>STORICO UTILIZZI</p>
            {transactions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-quaternary)", fontStyle: "italic" }}>Nessun utilizzo registrato</p>
            ) : (
              <div className="flex flex-col gap-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="group flex items-center justify-between py-2 px-2 rounded-lg"
                    style={{ transition: "background 0.1s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span style={{ fontSize: 11, color: "var(--text-quaternary)", flexShrink: 0 }}>
                        {new Date(tx.transaction_date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.description || "Utilizzo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", fontFamily: "DM Mono, monospace" }}>
                        -€{tx.amount.toFixed(2)}
                      </span>
                      {deleteConfirmTx === tx.id ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { onDeleteTransaction(tx.id); setDeleteConfirmTx(null); }}
                            style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(239,68,68,0.2)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check style={{ width: 10, height: 10 }} />
                          </button>
                          <button type="button" onClick={() => setDeleteConfirmTx(null)}
                            style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✕</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirmTx(tx.id)}
                          className="opacity-0 group-hover:opacity-100"
                          style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(239,68,68,0.08)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.15s" }}>
                          <Trash2 style={{ width: 10, height: 10 }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
            {deleteConfirmCard ? (
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>⚠️ Eliminare la Gift Card {card.brand}?</p>
                <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 8 }}>Saldo residuo: €{card.remaining_value.toFixed(2)}. Verranno eliminate anche tutte le transazioni associate.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDeleteConfirmCard(false)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "var(--text-tertiary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Annulla</button>
                  <button type="button" onClick={onDelete}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Elimina</button>
                </div>
              </div>
            ) : archiveConfirm ? (
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(201,169,110,0.05)", border: "1px solid rgba(201,169,110,0.15)", marginBottom: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#c9a96e", marginBottom: 4 }}>📦 Archiviare la Gift Card {card.brand}?</p>
                <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 8 }}>La card verrà spostata nell'archivio. Puoi ripristinarla in qualsiasi momento.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setArchiveConfirm(false)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "var(--text-tertiary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Annulla</button>
                  <button type="button" onClick={onArchive}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", background: "#c9a96e", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Archivia</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={onEdit}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  ✏️ Modifica
                </button>
                <button type="button" onClick={() => setArchiveConfirm(true)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  📦 Archivia
                </button>
                <button type="button" onClick={() => setDeleteConfirmCard(true)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  🗑 Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>{label}</span>
      <span style={{ fontSize: 12, color: color ?? "var(--text-secondary)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
