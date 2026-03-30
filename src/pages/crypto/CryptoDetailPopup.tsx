import { useState, useEffect, useCallback } from "react";
import { X, Plus, Minus, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { EnrichedHolding } from "@/portals/finance/types/crypto";
import { fetchCoinHistory } from "@/portals/finance/services/cryptoService";
import { formatEUR } from "@/portals/finance/utils/currency";
import { localAdd } from "@/lib/personalTransactionStore";
import { broadcastFinanceUpdate } from "@/lib/financeRealtime";
import { addAuditEntry } from "@/lib/adminStore";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";

const GOLD = "#c9a96e";

const PERIODS = [
  { label: "7G", days: 7 },
  { label: "30G", days: 30 },
  { label: "90G", days: 90 },
  { label: "1A", days: 365 },
] as const;

// ── Transaction history (localStorage) ────────────────────────────────────────

interface CryptoTx {
  id: string;
  coin_id: string;
  type: "buy" | "sell";
  quantity: number;
  title: string;
  date: string;
}

function txHistoryKey(portalId: string): string {
  return `crypto_tx_history_${portalId}`;
}

function readTxHistory(coinId: string, portalId: string): CryptoTx[] {
  try {
    const key = txHistoryKey(portalId);
    let raw = localStorage.getItem(key);
    // Migrate from old global key
    if (!raw) {
      const legacy = localStorage.getItem("crypto_tx_history");
      if (legacy) { localStorage.setItem(key, legacy); raw = legacy; }
    }
    const all: CryptoTx[] = raw ? JSON.parse(raw) : [];
    return all.filter((t) => t.coin_id === coinId).sort((a, b) => b.date.localeCompare(a.date));
  } catch { return []; }
}

function saveTx(tx: CryptoTx, portalId: string): void {
  try {
    const key = txHistoryKey(portalId);
    const raw = localStorage.getItem(key);
    const all: CryptoTx[] = raw ? JSON.parse(raw) : [];
    all.push(tx);
    localStorage.setItem(key, JSON.stringify(all));
  } catch { /* noop */ }
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "6px 12px" }}>
      <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{formatEUR(payload[0].value)}</p>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  holding: EnrichedHolding;
  onClose: () => void;
  onUpdateQuantity: (newQuantity: number) => Promise<void>;
}

export function CryptoDetailPopup({ holding, onClose, onUpdateQuantity }: Props) {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [days, setDays] = useState(30);
  const [chartData, setChartData] = useState<{ date: string; price: number }[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [txHistory, setTxHistory] = useState<CryptoTx[]>([]);

  // Add/Remove mode: null = buttons shown, "buy" or "sell" = form shown
  const [actionMode, setActionMode] = useState<"buy" | "sell" | null>(null);
  const [actionQty, setActionQty] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Live quantity (updates after add/remove without closing popup)
  const [liveQty, setLiveQty] = useState(holding.quantity);

  // Load chart
  const loadChart = useCallback(async () => {
    setChartLoading(true);
    try {
      const data = await fetchCoinHistory(holding.coin_id, days);
      setChartData(data.map((d) => ({
        date: new Date(d.timestamp).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
        price: d.price,
      })));
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [holding.coin_id, days]);

  useEffect(() => { loadChart(); }, [loadChart]);

  // Load tx history
  useEffect(() => {
    setTxHistory(readTxHistory(holding.coin_id, portalId));
  }, [holding.coin_id]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const up24 = holding.priceChange24h >= 0;
  const chartUp = chartData.length >= 2 ? chartData[chartData.length - 1].price >= chartData[0].price : true;
  const chartColor = chartUp ? "#22c55e" : "#ef4444";
  const liveValue = liveQty * holding.currentPrice;

  async function handleAction() {
    const qty = parseFloat(actionQty);
    if (!qty || qty <= 0 || saving) return;
    if (actionMode === "sell" && qty > liveQty) return; // can't sell more than you have

    setSaving(true);
    try {
      const newTotal = actionMode === "buy" ? liveQty + qty : liveQty - qty;
      await onUpdateQuantity(newTotal);
      setLiveQty(newTotal);

      const txDate = new Date().toISOString().slice(0, 10);
      const txTitle = actionTitle.trim() || (actionMode === "buy" ? `Acquisto ${holding.symbol}` : `Vendita ${holding.symbol}`);

      // Save to crypto tx history
      saveTx({
        id: crypto.randomUUID(),
        coin_id: holding.coin_id,
        type: actionMode!,
        quantity: qty,
        title: txTitle,
        date: txDate,
      }, portalId);

      // Audit log entry
      const eurValue = qty * holding.currentPrice;
      if (user) {
        addAuditEntry({
          userId: user.id,
          action: `${actionMode === "buy" ? "Added" : "Removed"} ${qty.toFixed(qty < 1 ? 8 : 4)} ${holding.symbol} — ${txTitle}`,
          category: "finance",
          details: `${formatEUR(eurValue)} at ${formatEUR(holding.currentPrice)}/${holding.symbol}`,
          icon: actionMode === "buy" ? "📈" : "📉",
          portalId,
        });

        // Also create a personal transaction so it shows on the Transactions page
        localAdd({
          user_id: user.id,
          type: actionMode === "buy" ? "expense" : "income",
          amount: Math.round(eurValue * 100) / 100,
          currency: "EUR",
          category: "Crypto",
          description: `${txTitle} — ${qty.toFixed(qty < 1 ? 8 : 4)} ${holding.symbol}`,
          date: txDate,
          payment_method: "crypto",
          is_recurring: false,
          tags: ["crypto", holding.symbol],
        }, user.id, portalId);
        broadcastFinanceUpdate("transaction_added");
      }

      setTxHistory(readTxHistory(holding.coin_id, portalId));
      setActionMode(null);
      setActionQty("");
      setActionTitle("");
    } finally {
      setSaving(false);
    }
  }

  const parsedQty = parseFloat(actionQty) || 0;
  const sellTooMuch = actionMode === "sell" && parsedQty > liveQty;

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ pointerEvents: "none" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        style={{
          width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto",
          background: "var(--glass-bg-elevated, #1a1a1a)",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
          borderRadius: 16, padding: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {holding.imageUrl && <img src={holding.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />}
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{holding.symbol}</span>
                <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>{holding.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span style={{ fontSize: 15, fontWeight: 600, color: GOLD }}>{formatEUR(holding.currentPrice)}</span>
                <span className="flex items-center gap-0.5" style={{ fontSize: 12, fontWeight: 600, color: up24 ? "#22c55e" : "#ef4444" }}>
                  {up24 ? <TrendingUp style={{ width: 12, height: 12 }} /> : <TrendingDown style={{ width: 12, height: 12 }} />}
                  {up24 ? "+" : ""}{(holding.priceChange24h ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--btn-glass-bg)", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
            <X style={{ width: 15, height: 15, color: "var(--text-secondary)", strokeWidth: 1.7 }} />
          </button>
        </div>

        {/* ── Balance cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--glass-border)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Quantità</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {liveQty.toFixed(liveQty < 1 ? 8 : 4)} {holding.symbol}
            </p>
          </div>
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "0.5px solid var(--glass-border)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Valore</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: GOLD, fontVariantNumeric: "tabular-nums" }}>
              {formatEUR(liveValue)}
            </p>
          </div>
        </div>

        {/* ── Interactive Chart ────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div className="flex items-center justify-between mb-2">
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
              PREZZO {holding.symbol}
            </p>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button key={p.days} type="button" onClick={() => setDays(p.days)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, border: "none", cursor: "pointer",
                    background: days === p.days ? `${GOLD}25` : "transparent",
                    color: days === p.days ? GOLD : "var(--text-quaternary)",
                    transition: "all 0.15s",
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {chartLoading ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
              <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Caricamento grafico...</span>
            </div>
          ) : chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id={`detailGrad-${holding.coin_id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-quaternary)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis hide domain={["dataMin * 0.97", "dataMax * 1.03"]} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="price" stroke={chartColor} strokeWidth={2} fill={`url(#detailGrad-${holding.coin_id})`} dot={false} animationDuration={600} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
              <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Dati non disponibili</span>
            </div>
          )}
        </div>

        {/* ── Add / Remove Buttons ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {actionMode ? (
            <motion.div
              key="form"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden", marginBottom: 20 }}
            >
              <div style={{ padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `0.5px solid ${actionMode === "buy" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: actionMode === "buy" ? "#22c55e" : "#ef4444", marginBottom: 10 }}>
                  {actionMode === "buy" ? `Aggiungi ${holding.symbol}` : `Rimuovi ${holding.symbol}`}
                </p>
                {/* Title */}
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder={actionMode === "buy" ? "Es. Comprato su Binance" : "Es. Venduto su Coinbase"}
                  style={{
                    width: "100%", padding: "9px 14px", borderRadius: 10, fontSize: 12,
                    background: "var(--btn-glass-bg)", border: "0.5px solid var(--btn-glass-border)",
                    color: "var(--text-primary)", outline: "none", marginBottom: 8,
                  }}
                />
                {/* Quantity */}
                <div className="flex gap-2">
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={actionQty}
                      onChange={(e) => setActionQty(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      style={{
                        width: "100%", padding: "10px 50px 10px 14px", borderRadius: 10, fontSize: 14,
                        background: "var(--btn-glass-bg)", border: `0.5px solid ${sellTooMuch ? "#ef4444" : "var(--btn-glass-border)"}`,
                        color: "var(--text-primary)", outline: "none", fontVariantNumeric: "tabular-nums", fontWeight: 600,
                      }}
                    />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-quaternary)" }}>
                      {holding.symbol}
                    </span>
                  </div>
                  <button type="button" onClick={handleAction}
                    disabled={saving || parsedQty <= 0 || sellTooMuch}
                    style={{
                      padding: "10px 20px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: actionMode === "buy" ? "#22c55e" : "#ef4444",
                      color: "#fff",
                      opacity: (parsedQty > 0 && !sellTooMuch && !saving) ? 1 : 0.4,
                    }}>
                    {saving ? "..." : actionMode === "buy" ? "Aggiungi" : "Rimuovi"}
                  </button>
                  <button type="button" onClick={() => { setActionMode(null); setActionQty(""); setActionTitle(""); }}
                    style={{ width: 40, height: 40, borderRadius: 10, border: "0.5px solid var(--glass-border)", background: "transparent", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                {sellTooMuch && (
                  <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                    Non puoi rimuovere più di {liveQty.toFixed(liveQty < 1 ? 8 : 4)} {holding.symbol}
                  </p>
                )}
                {parsedQty > 0 && !sellTooMuch && (
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>
                    {actionMode === "buy" ? "Nuovo totale" : "Totale dopo"}: {(actionMode === "buy" ? liveQty + parsedQty : liveQty - parsedQty).toFixed(liveQty < 1 ? 8 : 4)} {holding.symbol}
                    {" "}({formatEUR((actionMode === "buy" ? liveQty + parsedQty : liveQty - parsedQty) * holding.currentPrice)})
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="buttons"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
              style={{ marginBottom: 20 }}
            >
              <button type="button" onClick={() => setActionMode("buy")}
                className="flex items-center justify-center gap-2 flex-1"
                style={{
                  padding: "11px 0", borderRadius: 10, border: "1px solid rgba(34,197,94,0.2)",
                  background: "rgba(34,197,94,0.06)", color: "#22c55e",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)"; }}>
                <Plus style={{ width: 14, height: 14 }} />
                Aggiungi {holding.symbol}
              </button>
              <button type="button" onClick={() => setActionMode("sell")}
                className="flex items-center justify-center gap-2 flex-1"
                style={{
                  padding: "11px 0", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)",
                  background: "rgba(239,68,68,0.06)", color: "#ef4444",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)"; }}>
                <Minus style={{ width: 14, height: 14 }} />
                Rimuovi {holding.symbol}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Transaction History ──────────────────────────────────── */}
        <div style={{ borderTop: "0.5px solid var(--glass-border)", paddingTop: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10 }}>
            ULTIME OPERAZIONI
          </p>
          {txHistory.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-quaternary)", textAlign: "center", padding: "20px 0" }}>
              Nessuna operazione registrata
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {txHistory.slice(0, 15).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between"
                  style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", transition: "background 0.1s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: tx.type === "buy" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {tx.type === "buy"
                        ? <Plus style={{ width: 12, height: 12, color: "#22c55e" }} />
                        : <Minus style={{ width: 12, height: 12, color: "#ef4444" }} />
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                        {tx.title || (tx.type === "buy" ? "Acquisto" : "Vendita")}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>
                        <span style={{ color: tx.type === "buy" ? "#22c55e" : "#ef4444" }}>{tx.type === "buy" ? "Acquisto" : "Vendita"}</span>
                        {" · "}{tx.date}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {tx.type === "buy" ? "+" : "−"}{tx.quantity.toFixed(tx.quantity < 1 ? 8 : 4)} {holding.symbol}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
      </div>
    </>
  );
}
