import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Plus, Pencil, Trash2, Check } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatEUR } from "@/portals/finance/utils/currency";
import { calcCurrentValue, calcPnL, calcROI, type Investment, INVESTMENT_TYPE_LABELS } from "@/lib/investmentStore";
import { InvestmentModal } from "@/components/InvestmentModal";

/* ── Shared helpers ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Props ───────────────────────────────────────────────────────── */

interface CryptoWidgetProps {
  readonly investments: readonly Investment[];
  readonly totalValue: number;
  readonly totalCost: number;
  readonly totalPnL: number;
  readonly totalROI: number;
  readonly addInvestment: (data: Omit<Investment, "id">) => void;
  readonly updateInvestment: (id: string, data: Omit<Investment, "id">) => void;
  readonly deleteInvestment: (id: string) => void;
}

/* ── Component ───────────────────────────────────────────────────── */

export function CryptoWidget({
  investments,
  totalValue,
  totalCost,
  totalPnL,
  totalROI,
  addInvestment,
  updateInvestment,
  deleteInvestment,
}: CryptoWidgetProps) {
  const [invModalOpen, setInvModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | undefined>(undefined);
  const [deleteInvId, setDeleteInvId] = useState<string | null>(null);

  function openAddInv() { setEditingInv(undefined); setInvModalOpen(true); }
  function openEditInv(inv: Investment) { setEditingInv(inv); setInvModalOpen(true); }
  function handleInvSave(data: Omit<Investment, "id">) {
    if (editingInv) updateInvestment(editingInv.id, data);
    else addInvestment(data);
  }

  return (
    <motion.div variants={fadeUp} custom={0.38} initial="hidden" animate="visible">
      <LiquidGlassCard accentColor="#22d3ee" hover={false}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp style={{ width: 16, height: 16, color: "#22d3ee" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Portfolio</h3>
          </div>
          <button type="button" onClick={openAddInv} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Value", value: formatEUR(totalValue), color: "#22d3ee" },
            { label: "Invested", value: formatEUR(totalCost), color: "var(--text-primary)" },
            { label: "P&L", value: formatEUR(totalPnL, { sign: true }), color: totalPnL >= 0 ? "#2ECC71" : "#FF5A5A" },
            { label: "Return", value: `${totalROI >= 0 ? "+" : ""}${totalROI.toFixed(1)}%`, color: totalROI >= 0 ? "#2ECC71" : "#FF5A5A" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: "0.5px solid var(--glass-border)" }}>
              <p style={{ fontSize: 10, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: s.color, letterSpacing: "-0.4px", marginTop: 4 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Holdings + donut */}
        <div className="flex gap-5 items-start">
          {/* Holdings list */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <AnimatePresence>
              {investments.map((inv, i) => {
                const value = calcCurrentValue(inv);
                const pnl = calcPnL(inv);
                const roi = calcROI(inv);
                const isConfirm = deleteInvId === inv.id;
                return (
                  <motion.div
                    key={inv.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: 0.04 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${inv.color}22` }}
                  >
                    {/* Icon */}
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${inv.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 16 }}>{inv.emoji}</span>
                    </div>
                    {/* Name + type */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.name}</p>
                        {inv.ticker && inv.ticker !== "\u2014" && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: `${inv.color}18`, color: inv.color }}>{inv.ticker}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 2 }}>{INVESTMENT_TYPE_LABELS[inv.type]} · {inv.units} units</p>
                    </div>
                    {/* Value + P&L */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{"\u20AC"}{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: pnl >= 0 ? "#2ECC71" : "#FF5A5A" }}>
                        {pnl >= 0 ? "+" : ""}{"\u20AC"}{Math.abs(pnl).toFixed(0)} ({roi >= 0 ? "+" : ""}{roi.toFixed(1)}%)
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!isConfirm ? (
                        <>
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEditInv(inv)}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Pencil style={{ width: 11, height: 11 }} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => setDeleteInvId(inv.id)}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,90,90,0.08)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Trash2 style={{ width: 11, height: 11 }} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: 10, color: "#FF5A5A", marginRight: 2 }}>Delete?</span>
                          <button
                            type="button"
                            onClick={() => { deleteInvestment(inv.id); setDeleteInvId(null); }}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,90,90,0.2)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Check style={{ width: 11, height: 11 }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteInvId(null)}
                            style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}
                          >
                            {"\u2715"}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {investments.length === 0 && (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No holdings yet — add your first investment</p>
              </div>
            )}
          </div>

          {/* Donut allocation chart */}
          {investments.length > 0 && (
            <div style={{ flexShrink: 0, width: 140 }} className="hidden sm:block">
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, textAlign: "center" }}>Allocation</p>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={investments.map(inv => ({ name: inv.name, value: calcCurrentValue(inv), color: inv.color }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {investments.map((inv) => <Cell key={inv.id} fill={inv.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-2">
                {investments.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-1.5">
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: inv.color, flexShrink: 0 }} />
                    <p style={{ fontSize: 10, color: "var(--text-quaternary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.name}</p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", marginLeft: "auto", flexShrink: 0 }}>
                      {totalValue > 0 ? Math.round((calcCurrentValue(inv) / totalValue) * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </LiquidGlassCard>

      <InvestmentModal
        open={invModalOpen}
        onClose={() => { setInvModalOpen(false); setEditingInv(undefined); }}
        onSave={handleInvSave}
        initial={editingInv}
      />
    </motion.div>
  );
}
