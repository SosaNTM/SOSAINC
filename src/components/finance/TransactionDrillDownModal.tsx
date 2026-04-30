import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { PersonalTransaction } from "@/types/finance";
import type { DateRange } from "@/hooks/useFinanceSummary";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  totalAmount: number;
  transactions: PersonalTransaction[];
  isLoading: boolean;
  formatAmount: (n: number) => string;
  range?: DateRange;
}

export function TransactionDrillDownModal({
  open, onClose, title, totalAmount, transactions, isLoading, formatAmount, range,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ── Timeline chart data ────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!transactions.length) return [];

    const map: Record<string, number> = {};
    transactions.forEach(tx => { map[tx.date] = (map[tx.date] ?? 0) + tx.amount; });

    if (range) {
      const result: { label: string; amount: number; date: string }[] = [];
      const cur = new Date(range.from + "T00:00:00");
      const end = new Date(range.to   + "T00:00:00");
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10);
        result.push({
          date:   d,
          amount: map[d] ?? 0,
          label:  cur.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
        });
        cur.setDate(cur.getDate() + 1);
      }
      return result;
    }

    // No range — use only dates present in transactions
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date, amount,
        label: new Date(date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" }),
      }));
  }, [transactions, range]);

  // Color: majority type wins
  const chartColor = useMemo(() => {
    const incomeCount = transactions.filter(t => t.type === "income").length;
    return incomeCount > transactions.length - incomeCount
      ? "var(--color-success)"
      : "var(--color-error)";
  }, [transactions]);

  // Peak day for reference line label
  const peakEntry = useMemo(() =>
    chartData.reduce((best, d) => d.amount > best.amount ? d : best, { amount: 0, label: "", date: "" }),
  [chartData]);

  const hasChart = chartData.some(d => d.amount > 0) && chartData.length > 1;

  // X-axis tick interval — show ~6 labels max
  const tickInterval = hasChart ? Math.max(0, Math.floor(chartData.length / 6) - 1) : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drill-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              padding: isMobile ? 0 : "20px",
            }}
          >
            <motion.div
              key="drill-panel"
              initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 16 }}
              animate={isMobile ? { y: 0 }       : { opacity: 1, scale: 1,    y: 0  }}
              exit={isMobile   ? { y: "100%" }   : { opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                zIndex: 1001,
                width: isMobile ? "100%" : "min(580px, 92vw)",
                maxHeight: isMobile ? "88vh" : "82vh",
                borderRadius: isMobile ? "16px 16px 0 0" : 16,
                background: "var(--glass-bg-elevated)",
                border: "1px solid var(--glass-border)",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* ── Header ──────────────────────────────────────────────────── */}
              <div style={{
                padding: "18px 20px 14px",
                borderBottom: "1px solid var(--glass-border)",
                display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", margin: "0 0 4px" }}>
                    Dettaglio
                  </p>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px", fontFamily: "var(--font-display)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {title}
                  </h2>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                      {formatAmount(totalAmount)}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                      {transactions.length} transazioni
                    </span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4, flexShrink: 0, marginTop: 2 }}
                  aria-label="Chiudi"
                >
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>

              {/* ── Timeline chart ───────────────────────────────────────────── */}
              {hasChart && (
                <div style={{ padding: "16px 20px 0", flexShrink: 0, borderBottom: "1px solid var(--glass-border)" }}>
                  <p style={{ fontSize: 9, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)", margin: "0 0 8px" }}>
                    Timeline
                    {peakEntry.amount > 0 && (
                      <span style={{ marginLeft: 10, color: chartColor, fontWeight: 600 }}>
                        picco {peakEntry.label} — {formatAmount(peakEntry.amount)}
                      </span>
                    )}
                  </p>
                  <ResponsiveContainer width="100%" height={96}>
                    <AreaChart data={chartData} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="drill-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}
                        axisLine={false} tickLine={false}
                        interval={tickInterval}
                      />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload }: any) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          if (d.amount === 0) return null;
                          return (
                            <div style={{
                              background: "var(--glass-bg-elevated)",
                              border: "1px solid var(--glass-border)",
                              borderRadius: 8, padding: "6px 10px",
                              fontFamily: "var(--font-mono)", fontSize: 11,
                            }}>
                              <p style={{ color: "var(--text-tertiary)", margin: "0 0 2px", fontSize: 10 }}>{d.label}</p>
                              <p style={{ color: chartColor, margin: 0, fontWeight: 700 }}>{formatAmount(d.amount)}</p>
                            </div>
                          );
                        }}
                        cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
                      />
                      {/* Peak reference line */}
                      {peakEntry.amount > 0 && (
                        <ReferenceLine
                          x={peakEntry.label}
                          stroke={chartColor}
                          strokeDasharray="3 3"
                          strokeOpacity={0.5}
                        />
                      )}
                      <Area
                        type="monotone" dataKey="amount" name="Importo"
                        stroke={chartColor} strokeWidth={2}
                        fill="url(#drill-grad)" dot={false}
                        activeDot={{ r: 4, fill: chartColor, stroke: "var(--glass-bg-elevated)", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Transaction list ─────────────────────────────────────────── */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>
                {isLoading ? (
                  [1,2,3,4,5].map(i => (
                    <div key={i} style={{ height: 48, borderRadius: 8, background: "var(--glass-bg)", marginBottom: 6, animation: "recap-pulse 1.5s ease-in-out infinite" }} />
                  ))
                ) : transactions.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 13, fontFamily: "var(--font-mono)", marginTop: 24 }}>
                    Nessuna transazione
                  </p>
                ) : (
                  transactions
                    .slice()
                    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount)
                    .map(tx => (
                      <div
                        key={tx.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 9, marginBottom: 6,
                          background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: tx.type === "income" ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                        }}>
                          {tx.type === "income"
                            ? <ArrowUpRight style={{ width: 14, height: 14, color: "var(--color-success)" }} />
                            : <ArrowDownRight style={{ width: 14, height: 14, color: "var(--color-error)" }} />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tx.subcategory ?? tx.description ?? tx.category}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0, fontFamily: "var(--font-mono)" }}>
                            {tx.category} · {new Date(tx.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })}
                            {tx.payment_method && ` · ${tx.payment_method.replace("_", " ")}`}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0,
                          color: tx.type === "income" ? "var(--color-success)" : "var(--color-error)",
                        }}>
                          {tx.type === "income" ? "+" : "-"}{formatAmount(tx.amount)}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
