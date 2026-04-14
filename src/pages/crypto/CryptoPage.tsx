import React, { useState, useEffect } from "react";
import { STORAGE_CRYPTO_TX_HISTORY_PREFIX, STORAGE_CRYPTO_TX_HISTORY_LEGACY, STORAGE_CRYPTO_TX_MIGRATED_PREFIX } from "@/constants/storageKeys";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Plus, TrendingUp, TrendingDown,
  Pencil, Trash2,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis,
} from "recharts";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";
import { useCryptoPortfolio } from "@/portals/finance/hooks/useCryptoPortfolio";
import { useCryptoChart } from "@/portals/finance/hooks/useCryptoChart";
import { formatEUR } from "@/portals/finance/utils/currency";
import type { EnrichedHolding } from "@/portals/finance/types/crypto";
import { CryptoHoldingModal } from "./CryptoHoldingModal";
import { CryptoDeleteConfirm } from "./CryptoDeleteConfirm";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CryptoDetailPopup } from "./CryptoDetailPopup";
import { localGetAll, localAdd } from "@/lib/personalTransactionStore";
import { addAuditEntry } from "@/lib/adminStore";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { GlassTooltip } from "@/components/ui/GlassTooltip";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { Coins } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const GOLD = "#e8ff00";
const COIN_COLORS = [
  "#F7931A", "#627EEA", "#14F195", "#E84142", "#2775CA",
  "#F0B90B", "#8247E5", "#00D1FF", "#22d3ee", "#10b981",
  "#f59e0b", "#ef4444", "#8b5cf6", "#0033ad", "#c3a634",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

function coinColor(index: number): string {
  return COIN_COLORS[index % COIN_COLORS.length];
}

function timeAgo(date: Date | null): string {
  if (!date) return "never";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function liveIndicatorColor(date: Date | null): string {
  if (!date) return "#ef4444";
  const minutes = (Date.now() - date.getTime()) / 60000;
  if (minutes < 10) return "#22c55e";
  if (minutes < 30) return "#f59e0b";
  return "#ef4444";
}

function liveLabel(date: Date | null): string {
  if (!date) return "Offline";
  const minutes = (Date.now() - date.getTime()) / 60000;
  if (minutes < 10) return "Live";
  if (minutes < 30) return "Stale";
  return "Offline";
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ padding: "20px 24px", borderRadius: 14, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: "0.5px solid var(--glass-border)" }}>
      <div style={{ width: 80, height: 10, borderRadius: 4, background: "rgba(255,255,255,0.06)", marginBottom: 12 }} className="animate-pulse" />
      <div style={{ width: 120, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.08)", marginBottom: 8 }} className="animate-pulse" />
      <div style={{ width: 60, height: 10, borderRadius: 4, background: "rgba(255,255,255,0.05)" }} className="animate-pulse" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3" style={{ padding: "12px 14px" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} className="animate-pulse" />
      <div className="flex-1">
        <div style={{ width: 100, height: 12, borderRadius: 4, background: "rgba(255,255,255,0.07)", marginBottom: 6 }} className="animate-pulse" />
        <div style={{ width: 60, height: 10, borderRadius: 4, background: "rgba(255,255,255,0.05)" }} className="animate-pulse" />
      </div>
      <div style={{ width: 80, height: 16, borderRadius: 4, background: "rgba(255,255,255,0.06)" }} className="animate-pulse" />
    </div>
  );
}

const fmtCryptoTooltip = (v: number) => formatEUR(v);

const CHART_PERIODS = [
  { label: "7G", days: 7 },
  { label: "30G", days: 30 },
  { label: "90G", days: 90 },
] as const;

// ── Main Component ───────────────────────────────────────────────────────────

export default function CryptoPage() {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const {
    enrichedHoldings, summary,
    isLoading, lastUpdated, isRefreshing,
    isPriceStale,
    refreshPrices, getPriceForCoin,
    addHolding, updateHolding, deleteHolding,
  } = useCryptoPortfolio();

  const { toast } = useToast();

  // Show a destructive toast when crypto prices become stale
  useEffect(() => {
    if (isPriceStale) {
      toast({
        title: "Crypto prices may be outdated",
        description: "Unable to refresh live prices. Values shown may not be current.",
        variant: "destructive",
      });
    }
  }, [isPriceStale]);

  // ── Migrate old crypto_tx_history into personal transactions (once) ────────
  React.useEffect(() => {
    if (!user) return;
    const MIGRATED_KEY = `${STORAGE_CRYPTO_TX_MIGRATED_PREFIX}${portalId}`;
    if (localStorage.getItem(MIGRATED_KEY)) return;

    try {
      const raw = localStorage.getItem(`${STORAGE_CRYPTO_TX_HISTORY_PREFIX}_${portalId}`) || localStorage.getItem(STORAGE_CRYPTO_TX_HISTORY_LEGACY);
      if (!raw) { localStorage.setItem(MIGRATED_KEY, "1"); return; }
      const cryptoTxs: { id: string; coin_id: string; type: "buy" | "sell"; quantity: number; title?: string; date: string }[] = JSON.parse(raw);
      if (cryptoTxs.length === 0) { localStorage.setItem(MIGRATED_KEY, "1"); return; }

      // Check which crypto tx IDs already exist as personal transactions
      const existing = localGetAll(portalId);
      const existingDescriptions = new Set(existing.map((t) => t.description));

      for (const tx of cryptoTxs) {
        const desc = `${tx.title || (tx.type === "buy" ? "Acquisto" : "Vendita")} — ${tx.quantity.toFixed(tx.quantity < 1 ? 8 : 4)} ${tx.coin_id.toUpperCase()}`;
        if (existingDescriptions.has(desc)) continue; // already migrated

        localAdd({
          user_id: user.id,
          type: tx.type === "buy" ? "expense" : "income",
          amount: 0, // we don't know EUR value at time of old tx
          currency: "EUR",
          category: "Crypto",
          description: desc,
          date: tx.date,
          payment_method: "crypto",
          is_recurring: false,
          tags: ["crypto", tx.coin_id],
        }, user.id, portalId);
      }
      localStorage.setItem(MIGRATED_KEY, "1");
    } catch { /* ignore migration errors */ }
  }, [user, portalId]);

  // Chart
  const [chartDays, setChartDays] = useState(30);
  const { chartData, isLoading: chartLoading } = useCryptoChart(enrichedHoldings, chartDays);

  // Modal state
  const [holdingModalOpen, setHoldingModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<EnrichedHolding | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string; detail?: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailHolding, setDetailHolding] = useState<EnrichedHolding | null>(null);

  // Allocation data for donut
  const allocationData = enrichedHoldings
    .filter((h) => h.totalValue > 0)
    .map((h, i) => ({ name: h.symbol, value: h.totalValue, color: coinColor(i) }));

  const topAllocation = allocationData.slice(0, 5);
  const otherValue = allocationData.slice(5).reduce((s, a) => s + a.value, 0);
  const donutData = otherValue > 0
    ? [...topAllocation, { name: "Other", value: otherValue, color: "#6b7280" }]
    : topAllocation;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openAddHolding() {
    setEditingHolding(null);
    setHoldingModalOpen(true);
  }
  function openEditHolding(h: EnrichedHolding) {
    setEditingHolding(h);
    setHoldingModalOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteHolding(deleteTarget.id);
    if (user) addAuditEntry({ userId: user.id, action: `Removed ${deleteTarget.label} from crypto portfolio`, category: "finance", details: deleteTarget.detail ?? "", icon: "🗑️", portalId });
    setDeleteTarget(null);
  }

  // ── Loading State ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-5">
        <LiquidGlassFilter />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div style={{ padding: 24, borderRadius: 16, background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
          {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────────

  if (enrichedHoldings.length === 0) {
    return (
      <div className="space-y-5">
        <LiquidGlassFilter />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <LiquidGlassCard accentColor={GOLD} hover={false}>
            <EmptyState
              icon={<Coins style={{ width: 48, height: 48 }} />}
              title="NO CRYPTO HOLDINGS"
              description="Track your cryptocurrency portfolio."
              actionLabel="ADD HOLDING"
              onAction={openAddHolding}
            />
          </LiquidGlassCard>
        </motion.div>

        <CryptoHoldingModal
          open={holdingModalOpen}
          onClose={() => { setHoldingModalOpen(false); setSaveError(null); }}
          onSave={async (data) => {
            try {
              setSaveError(null);
              await addHolding(data);
              setHoldingModalOpen(false);
            } catch (err) {
              // TODO: Replace with structured error logging (Sentry, etc.)
              console.error("Failed to add holding:", err);
              setSaveError((err as Error).message || "Errore nel salvataggio");
            }
          }}
          editing={null}
          existingCoinIds={[]}
          getPriceForCoin={getPriceForCoin}
          saveError={saveError}
        />
      </div>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <ModuleErrorBoundary moduleName="Crypto Portfolio">
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 22 }}>₿</span>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Crypto</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => refreshPrices()} title={`${liveLabel(lastUpdated)} · ${timeAgo(lastUpdated)}`}
            className="flex items-center gap-2" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: liveIndicatorColor(lastUpdated), display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>
              {liveLabel(lastUpdated)} · {timeAgo(lastUpdated)}
            </span>
          </button>
          <button type="button" onClick={() => refreshPrices()} disabled={isRefreshing}
            className="glass-btn flex items-center gap-1.5" style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>
            <RefreshCw style={{ width: 13, height: 13, animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
          <button type="button" onClick={openAddHolding}
            className="glass-btn-primary flex items-center gap-1.5" style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>
            <Plus style={{ width: 13, height: 13 }} />
            Aggiungi
          </button>
        </div>
      </motion.div>

      {/* ── Overview Cards ──────────────────────────────────────────── */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
        {[
          { label: "VALORE TOTALE", value: formatEUR(summary.totalValueEur), color: GOLD },
          { label: "INVESTITO", value: summary.totalInvestedEur > 0 ? formatEUR(summary.totalInvestedEur) : "—", color: "var(--text-primary)" },
          {
            label: "P/L",
            value: summary.totalInvestedEur > 0 ? formatEUR(summary.totalProfitLoss, { sign: true }) : "—",
            sub: summary.totalInvestedEur > 0 ? `${summary.totalProfitLossPercent >= 0 ? "+" : ""}${summary.totalProfitLossPercent.toFixed(1)}%` : undefined,
            color: summary.totalProfitLoss >= 0 ? "#22c55e" : "#ef4444",
          },
          {
            label: "24H",
            value: formatEUR(summary.change24hEur, { sign: true }),
            sub: `${summary.change24hPercent >= 0 ? "+" : ""}${summary.change24hPercent.toFixed(1)}%`,
            color: summary.change24hEur >= 0 ? "#22c55e" : "#ef4444",
          },
        ].map((card, i) => (
          <motion.div key={card.label} variants={fadeUp} custom={i * 0.06}
            style={{ padding: "20px 24px", borderRadius: 14, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: "0.5px solid var(--glass-border)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 8 }}>{card.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: card.color, letterSpacing: "-0.5px" }}>{card.value}</p>
            {"sub" in card && card.sub && (
              <div className="flex items-center gap-1 mt-1">
                {card.color === "#22c55e" ? <TrendingUp style={{ width: 11, height: 11, color: card.color }} /> : <TrendingDown style={{ width: 11, height: 11, color: card.color }} />}
                <span style={{ fontSize: 11, fontWeight: 600, color: card.color }}>{card.sub}</span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* ── Portfolio Chart ─────────────────────────────────────────── */}
      {enrichedHoldings.length > 0 && (
        <motion.div variants={fadeUp} custom={0.2} initial="hidden" animate="visible">
          <LiquidGlassCard accentColor={GOLD} hover={false}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase" }}>ANDAMENTO PORTFOLIO</p>
              <div className="flex gap-1">
                {CHART_PERIODS.map((p) => (
                  <button key={p.days} type="button" onClick={() => setChartDays(p.days)}
                    style={{
                      padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer",
                      background: chartDays === p.days ? `${GOLD}25` : "transparent",
                      color: chartDays === p.days ? GOLD : "var(--text-quaternary)",
                      transition: "all 0.15s",
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {chartLoading ? (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Caricamento...</span>
              </div>
            ) : chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["dataMin * 0.95", "dataMax * 1.05"]} />
                  <Tooltip content={<GlassTooltip formatter={fmtCryptoTooltip} />} />
                  <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2} fill="url(#portfolioGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Dati insufficienti</span>
              </div>
            )}
          </LiquidGlassCard>
        </motion.div>
      )}

      {/* ── Holdings + Allocation ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Holdings List */}
        <motion.div className={donutData.length > 0 ? "lg:col-span-2" : "lg:col-span-3"} variants={fadeUp} custom={0.25} initial="hidden" animate="visible">
          <LiquidGlassCard accentColor={GOLD} hover={false}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>LE MIE CRYPTO</p>

            {enrichedHoldings.map((h, i) => {
              const up24 = h.priceChange24h >= 0;
              const plUp = (h.profitLoss ?? 0) >= 0;
              return (
                <motion.div key={h.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i, duration: 0.3 }}
                  className="flex items-center gap-3"
                  onClick={() => setDetailHolding(h)}
                  style={{ padding: "12px 14px", borderRadius: 12, transition: "all 0.2s", cursor: "pointer", borderBottom: i < enrichedHoldings.length - 1 ? "0.5px solid var(--glass-border)" : "none" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--nav-hover-bg)";
                    (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}4d`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "var(--glass-border)";
                  }}>
                  {/* Icon */}
                  {h.imageUrl ? (
                    <img src={h.imageUrl} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${coinColor(i)}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: coinColor(i) }}>
                      {h.symbol.slice(0, 2)}
                    </div>
                  )}

                  {/* Name + Quantity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)" }}>{h.symbol}</span>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{h.name}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
                      {h.quantity.toFixed(h.quantity < 1 ? 8 : 4)} {h.symbol}
                    </p>
                  </div>

                  {/* Value + 24h + P/L */}
                  <div className="text-right flex-shrink-0">
                    <p style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{formatEUR(h.totalValue)}</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="flex items-center gap-0.5" style={{ fontSize: 11, fontWeight: 600, color: up24 ? "#22c55e" : "#ef4444" }}>
                        {up24 ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
                        {up24 ? "+" : ""}{(h.priceChange24h ?? 0).toFixed(1)}%
                      </span>
                      {h.profitLoss != null && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: plUp ? "#22c55e" : "#ef4444" }}>
                          P/L: {formatEUR(h.profitLoss, { sign: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" title="Modifica" onClick={(e) => { e.stopPropagation(); openEditHolding(h); }}
                      style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Pencil style={{ width: 11, height: 11 }} />
                    </button>
                    <button type="button" title="Elimina" onClick={(ev) => {
                      ev.stopPropagation();
                      setDeleteTarget({
                        id: h.id,
                        label: `${h.name} (${h.symbol})`,
                        detail: `Possiedi ${h.quantity.toFixed(h.quantity < 1 ? 8 : 4)} ${h.symbol} (${formatEUR(h.totalValue)}).`,
                      });
                    }}
                      style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(255,90,90,0.08)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Trash2 style={{ width: 11, height: 11 }} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </LiquidGlassCard>
        </motion.div>

        {/* Allocation Donut */}
        {donutData.length > 0 && (
          <motion.div variants={fadeUp} custom={0.3} initial="hidden" animate="visible">
            <LiquidGlassCard accentColor={GOLD} hover={false}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>ALLOCATION</p>
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<GlassTooltip formatter={fmtCryptoTooltip} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 w-full">
                  {donutData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                        {summary.totalValueEur > 0 ? Math.round((d.value / summary.totalValueEur) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </LiquidGlassCard>
          </motion.div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <CryptoHoldingModal
        open={holdingModalOpen}
        onClose={() => { setHoldingModalOpen(false); setEditingHolding(null); setSaveError(null); }}
        onSave={async (data) => {
          try {
            setSaveError(null);
            if (editingHolding) {
              await updateHolding(editingHolding.id, data);
              if (user) addAuditEntry({ userId: user.id, action: `Updated ${data.symbol} holding — ${data.quantity.toFixed(data.quantity < 1 ? 8 : 4)} ${data.symbol}`, category: "finance", details: "", icon: "✏️", portalId });
            } else {
              await addHolding(data);
              if (user) addAuditEntry({ userId: user.id, action: `Added ${data.symbol} to crypto portfolio — ${data.quantity.toFixed(data.quantity < 1 ? 8 : 4)} ${data.symbol}`, category: "finance", details: "", icon: "₿", portalId });
            }
            setHoldingModalOpen(false);
            setEditingHolding(null);
          } catch (err) {
            // TODO: Replace with structured error logging (Sentry, etc.)
            console.error("Failed to save holding:", err);
            setSaveError((err as Error).message || "Errore nel salvataggio");
          }
        }}
        editing={editingHolding}
        existingCoinIds={enrichedHoldings.map((h) => h.coin_id)}
        getPriceForCoin={getPriceForCoin}
        saveError={saveError}
      />

      <CryptoDeleteConfirm
        open={deleteTarget !== null}
        label={deleteTarget?.label ?? ""}
        detail={deleteTarget?.detail}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* ── Detail Popup (chart + add/remove + history) ──────────── */}
      <AnimatePresence>
        {detailHolding && (
          <CryptoDetailPopup
            holding={detailHolding}
            onClose={() => setDetailHolding(null)}
            onUpdateQuantity={async (newQty) => {
              await updateHolding(detailHolding.id, { quantity: newQty });
            }}
          />
        )}
      </AnimatePresence>
    </div>
    </ModuleErrorBoundary>
  );
}
