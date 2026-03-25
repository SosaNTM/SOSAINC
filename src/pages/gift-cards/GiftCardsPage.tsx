import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Plus, X, SlidersHorizontal } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { useGiftCards } from "@/portals/finance/hooks/useGiftCards";
import { useGiftCardsSummary } from "@/portals/finance/hooks/useGiftCardsSummary";
import { useGiftCardDetail } from "@/portals/finance/hooks/useGiftCardDetail";
import { formatEUR } from "@/portals/finance/utils/currency";
import { getStatusColor, getStatusLabel, getProgressColor } from "@/portals/finance/utils/giftCardUtils";
import type { EnrichedGiftCard, GiftCardFilter, GiftCardSort } from "@/portals/finance/types/giftCards";
import { GiftCardModal } from "./GiftCardModal";
import { GiftCardDetailPanel } from "./GiftCardDetailPanel";
import { GiftCardCodePopup } from "./GiftCardCodePopup";

const FILTER_LABELS: { value: GiftCardFilter; label: string }[] = [
  { value: "all", label: "Tutte" },
  { value: "active", label: "Attive" },
  { value: "partially_used", label: "Parz. usate" },
  { value: "fully_used", label: "Esaurite" },
  { value: "expired", label: "Scadute" },
  { value: "archived", label: "Archiviate" },
];

const SORT_OPTIONS: { value: GiftCardSort; label: string }[] = [
  { value: "remaining_desc", label: "Saldo ↓" },
  { value: "remaining_asc", label: "Saldo ↑" },
  { value: "expiry_asc", label: "Scadenza ↑" },
  { value: "recent", label: "Più recenti" },
  { value: "brand", label: "Brand A→Z" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: d, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function GiftCardsPage() {
  const {
    cards, brands, isLoading, filteredCards,
    createCard, updateCard, deleteCard, toggleFavorite, refetch,
    filter, setFilter, sort, setSort,
  } = useGiftCards();
  const { summary } = useGiftCardsSummary(cards);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<EnrichedGiftCard | null>(null);
  const [detailCard, setDetailCard] = useState<EnrichedGiftCard | null>(null);
  const [codeCard, setCodeCard] = useState<EnrichedGiftCard | null>(null);
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false);

  const { transactions, addTransaction, deleteTransaction, refetch: refetchTx } = useGiftCardDetail(detailCard?.id ?? null);

  const expiringSoonCards = cards.filter((c) => c.isExpiringSoon);

  function openAdd() { setEditingCard(null); setModalOpen(true); }
  function openEdit(card: EnrichedGiftCard) { setEditingCard(card); setModalOpen(true); }

  async function handleSave(data: Parameters<typeof createCard>[0]) {
    if (editingCard) {
      await updateCard(editingCard.id, data);
    } else {
      await createCard(data);
    }
    setModalOpen(false);
    setEditingCard(null);
  }

  async function handleDelete(id: string) {
    await deleteCard(id);
    setDetailCard(null);
  }

  async function handleArchive(id: string) {
    await updateCard(id, { status: "archived" } as any);
  }

  async function handleUseBalance(amount: number, description?: string, date?: string) {
    if (!detailCard) return;
    await addTransaction(amount, description, date);
    await refetch();
    // Refresh detail card with updated data
    const refreshed = cards.find((c) => c.id === detailCard.id);
    if (refreshed) setDetailCard(refreshed);
  }

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gift style={{ width: 18, height: 18, color: "#c9a96e" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Gift Cards</h2>
        </div>
        <button type="button" onClick={openAdd} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8 }}>
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </button>
      </motion.div>

      {/* Overview Cards */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "SALDO TOTALE", value: formatEUR(summary.totalRemainingEur), sub: `su ${summary.activeCount + summary.partiallyUsedCount} card`, color: "#c9a96e" },
          { label: "CARD ATTIVE", value: String(summary.activeCount + summary.partiallyUsedCount), sub: "", color: "#4ade80" },
          { label: "USATO", value: formatEUR(summary.totalUsedEur), sub: summary.totalInitialEur > 0 ? `${((summary.totalUsedEur / summary.totalInitialEur) * 100).toFixed(1)}%` : "0%", color: "var(--text-primary)" },
          { label: "IN SCADENZA", value: String(summary.expiringSoonCount), sub: "entro 30gg", color: summary.expiringSoonCount > 0 ? "#ef4444" : "var(--text-quaternary)" },
        ].map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} custom={i * 0.05}>
            <LiquidGlassCard hover={false} accentColor={stat.color}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-quaternary)", textTransform: "uppercase", marginBottom: 6 }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: stat.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{stat.value}</p>
              {stat.sub && <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 4 }}>{stat.sub}</p>}
            </LiquidGlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Expiry Banner */}
      {expiringSoonCards.length > 0 && !expiryBannerDismissed && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
              ⚠️ {expiringSoonCards.length} gift card scad{expiringSoonCards.length === 1 ? "e" : "ono"} entro 30 giorni:
            </p>
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
              {expiringSoonCards.map((c) => `${c.brand} (${formatEUR(c.remainingValueEur)} — ${c.daysUntilExpiry}gg)`).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={() => setExpiryBannerDismissed(true)} style={{ background: "none", border: "none", color: "var(--text-quaternary)", cursor: "pointer", flexShrink: 0 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </motion.div>
      )}

      {/* Filters & Sort */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "var(--segment-bg)", border: "1px solid var(--segment-border)", borderRadius: "var(--radius-sm)", padding: 3, flexWrap: "wrap" }}>
          {FILTER_LABELS.map((f) => (
            <button key={f.value} type="button" onClick={() => setFilter(f.value)}
              style={{ padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer", whiteSpace: "nowrap", background: filter === f.value ? "var(--segment-active-bg)" : "transparent", color: filter === f.value ? "var(--segment-active-text)" : "var(--segment-text)", boxShadow: filter === f.value ? "var(--glass-shadow)" : "none", transition: "all 0.15s" }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal style={{ width: 14, height: 14, color: "var(--text-quaternary)" }} />
          <select value={sort} onChange={(e) => setSort(e.target.value as GiftCardSort)}
            style={{ fontSize: 12, fontWeight: 600, background: "var(--segment-bg)", border: "1px solid var(--segment-border)", borderRadius: 6, padding: "6px 10px", color: "var(--text-secondary)", cursor: "pointer" }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: 200, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--glass-border)" }} />
          ))}
        </div>
      ) : filteredCards.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <LiquidGlassCard hover={false}>
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <Gift style={{ width: 40, height: 40, color: "var(--text-quaternary)", margin: "0 auto 16px" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6 }}>Nessuna gift card registrata</p>
              <p style={{ fontSize: 12, color: "var(--text-quaternary)", marginBottom: 20 }}>Aggiungi le tue gift card per tenere traccia del saldo e non dimenticare le scadenze</p>
              <button type="button" onClick={openAdd} className="glass-btn-primary flex items-center gap-1.5 mx-auto" style={{ fontSize: 12, padding: "8px 16px", borderRadius: 8 }}>
                <Plus className="w-3.5 h-3.5" /> Aggiungi Gift Card
              </button>
            </div>
          </LiquidGlassCard>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredCards.map((card, i) => (
              <GiftCardItem
                key={card.id}
                card={card}
                index={i}
                onSelect={setDetailCard}
                onToggleFavorite={toggleFavorite}
                onUseBalance={(c) => setDetailCard(c)}
                onEdit={openEdit}
                onShowCode={setCodeCard}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <GiftCardModal
          brands={brands}
          editingCard={editingCard}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingCard(null); }}
        />
      )}

      {codeCard && (
        <GiftCardCodePopup
          card={codeCard}
          onClose={() => setCodeCard(null)}
        />
      )}

      {detailCard && (
        <GiftCardDetailPanel
          card={detailCard}
          transactions={transactions}
          onClose={() => setDetailCard(null)}
          onEdit={() => { openEdit(detailCard); setDetailCard(null); }}
          onDelete={() => handleDelete(detailCard.id)}
          onArchive={() => handleArchive(detailCard.id)}
          onToggleFavorite={(fav) => toggleFavorite(detailCard.id, fav)}
          onUseBalance={handleUseBalance}
          onDeleteTransaction={async (txId) => { await deleteTransaction(txId); await refetch(); }}
          onShowCode={() => { setCodeCard(detailCard); }}
        />
      )}
    </div>
  );
}

/* ── Single Gift Card Item ─────────────────────────────────────────────────── */

function GiftCardItem({
  card, index, onSelect, onToggleFavorite, onEdit, onShowCode, onArchive, onDelete, onUseBalance,
}: {
  card: EnrichedGiftCard;
  index: number;
  onSelect: (c: EnrichedGiftCard) => void;
  onToggleFavorite: (id: string, fav: boolean) => void;
  onUseBalance: (c: EnrichedGiftCard) => void;
  onEdit: (c: EnrichedGiftCard) => void;
  onShowCode: (c: EnrichedGiftCard) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const brandColor = card.brandData?.color ?? "#6b7280";
  const remainPercent = card.initial_value > 0 ? (card.remaining_value / card.initial_value) * 100 : 0;
  const progressColor = getProgressColor(remainPercent);
  const isInactive = card.status === "fully_used" || card.status === "expired" || card.status === "archived";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onSelect(card)}
      style={{
        cursor: "pointer",
        padding: "18px 20px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.03)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        opacity: isInactive ? 0.6 : 1,
        transition: "all 0.2s",
        position: "relative",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${brandColor}40`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; }}
    >
      {/* Header: Favorite + Menu */}
      <div className="flex items-center justify-between mb-3">
        <button type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(card.id, !card.is_favorite); }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: card.is_favorite ? "#c9a96e" : "rgba(255,255,255,0.15)", transition: "color 0.15s" }}>
          ★
        </button>

        <div style={{ position: "relative" }}>
          <button type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text-quaternary)", padding: "2px 6px", letterSpacing: 1 }}>
            ···
          </button>
          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseLeave={() => setMenuOpen(false)}
              style={{ position: "absolute", right: 0, top: 24, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 4, minWidth: 160, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              {!isInactive && (
                <MenuBtn label="💳 Usa saldo" onClick={() => { setMenuOpen(false); onUseBalance(card); }} />
              )}
              <MenuBtn label="✏️ Modifica" onClick={() => { setMenuOpen(false); onEdit(card); }} />
              {card.card_code && <MenuBtn label="🔑 Mostra codice" onClick={() => { setMenuOpen(false); onShowCode(card); }} />}
              <MenuBtn label="📦 Archivia" onClick={() => { setMenuOpen(false); onArchive(card.id); }} />
              <MenuBtn label="🗑 Elimina" onClick={() => { setMenuOpen(false); onDelete(card.id); }} danger />
            </div>
          )}
        </div>
      </div>

      {/* Brand */}
      <div className="flex items-center gap-3 mb-4">
        <div style={{ width: 40, height: 40, borderRadius: 10, background: brandColor, opacity: 0.9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{card.brand.charAt(0)}</span>
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{card.brand}</p>
          <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Gift Card</p>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-3">
        <p style={{ fontSize: 13, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
          Saldo: <span style={{ fontWeight: 700 }}>{card.currency === "EUR" ? "€" : card.currency === "USD" ? "$" : "£"}{card.remaining_value.toFixed(2)}</span>
          <span style={{ color: "var(--text-quaternary)" }}> / {card.currency === "EUR" ? "€" : card.currency === "USD" ? "$" : "£"}{card.initial_value.toFixed(2)}</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${remainPercent}%` }}
            transition={{ duration: 0.6, delay: index * 0.04 + 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: "100%", borderRadius: 3, background: progressColor }}
          />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: progressColor, fontVariantNumeric: "tabular-nums", minWidth: 36, textAlign: "right" }}>
          {remainPercent.toFixed(0)}%
        </span>
      </div>

      {/* Status & Expiry */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 6, height: 6, borderRadius: 3, background: getStatusColor(card.status) }} />
          <span style={{ fontSize: 11, color: getStatusColor(card.status), fontWeight: 500 }}>{getStatusLabel(card.status)}</span>
        </div>
        <span style={{ fontSize: 11, color: card.isExpiringSoon ? "#ef4444" : card.isExpired ? "#ef4444" : "var(--text-quaternary)" }}>
          {card.isExpired
            ? `❌ Scaduta`
            : card.isExpiringSoon
              ? `⚠️ Scade tra ${card.daysUntilExpiry}gg`
              : card.expiry_date
                ? `Scade: ${new Date(card.expiry_date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}`
                : "Scade: —"
          }
        </span>
      </div>
    </motion.div>
  );
}

function MenuBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer", background: "transparent", color: danger ? "#ef4444" : "var(--text-secondary)", transition: "background 0.1s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
      {label}
    </button>
  );
}
