import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, Check } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useInvestments } from "@/hooks/useInvestments";
import { InvestmentModal } from "@/components/InvestmentModal";
import { GlassTooltip } from "@/components/ui/GlassTooltip";
import { calcCurrentValue, calcPnL, calcROI, type Investment, INVESTMENT_TYPE_LABELS } from "@/lib/investmentStore";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";

const fmtAllocTooltip = (v: number) =>
  `€${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Investments() {
  const { investments, totalValue, totalCost, totalPnL, totalROI, addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | undefined>(undefined);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  function openAdd()                  { setEditingInv(undefined); setModalOpen(true); }
  function openEdit(inv: Investment)  { setEditingInv(inv); setModalOpen(true); }
  function handleSave(data: Omit<Investment, "id">) {
    if (editingInv) updateInvestment(editingInv.id, data);
    else addInvestment(data);
    setModalOpen(false);
    setEditingInv(undefined);
  }

  const pieData = investments.map((inv) => ({ name: inv.name, value: calcCurrentValue(inv), color: inv.color }));

  return (
    <ModuleErrorBoundary moduleName="Investments">
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* Summary */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        {[
          { label: "Total Value",  value: `€${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,  color: "#22d3ee" },
          { label: "Invested",     value: `€${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,   color: "var(--text-primary)" },
          { label: "P&L",          value: `${totalPnL >= 0 ? "+" : ""}€${Math.abs(totalPnL).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: totalPnL >= 0 ? "#2ECC71" : "#FF5A5A" },
          { label: "Return",       value: `${totalROI >= 0 ? "+" : ""}${totalROI.toFixed(2)}%`, color: totalROI >= 0 ? "#2ECC71" : "#FF5A5A" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 14, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", marginTop: 4 }}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Holdings + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Holdings list — takes 2/3 */}
        <motion.div className="lg:col-span-2"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
          <LiquidGlassCard accentColor="#22d3ee" hover={false}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp style={{ width: 16, height: 16, color: "#22d3ee" }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Holdings</h3>
              </div>
              <button type="button" onClick={openAdd} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {investments.map((inv, i) => {
                  const value = calcCurrentValue(inv);
                  const pnl   = calcPnL(inv);
                  const roi   = calcROI(inv);
                  const isUp  = roi >= 0;
                  const isConfirm = deleteId === inv.id;
                  const alloc = totalValue > 0 ? (value / totalValue) * 100 : 0;

                  return (
                    <motion.div key={inv.id} layout
                      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: 0.05 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      style={{ padding: "16px 18px", borderRadius: 14, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${inv.color}25` }}>

                      <div className="flex items-start justify-between gap-3">
                        {/* Left: icon + name */}
                        <div className="flex items-center gap-3">
                          <div style={{ width: 40, height: 40, borderRadius: 11, background: `${inv.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 20 }}>{inv.emoji}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{inv.name}</p>
                              {inv.ticker && inv.ticker !== "—" && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: `${inv.color}18`, color: inv.color }}>{inv.ticker}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)" }}>{INVESTMENT_TYPE_LABELS[inv.type]}</span>
                              <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>{inv.units} units @ €{inv.avgBuyPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isConfirm ? (
                            <>
                              <button type="button" title="Edit" onClick={() => openEdit(inv)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Pencil style={{ width: 12, height: 12 }} />
                              </button>
                              <button type="button" title="Delete" onClick={() => setDeleteId(inv.id)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,90,90,0.08)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Trash2 style={{ width: 12, height: 12 }} />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span style={{ fontSize: 10, color: "#FF5A5A", marginRight: 2 }}>Delete?</span>
                              <button type="button" onClick={() => { deleteInvestment(inv.id); setDeleteId(null); }}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,90,90,0.2)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Check style={{ width: 12, height: 12 }} />
                              </button>
                              <button type="button" onClick={() => setDeleteId(null)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✕</button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress bar + metrics */}
                      <div style={{ marginTop: 14 }}>
                        <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${alloc}%` }}
                            transition={{ duration: 0.9, delay: 0.1 + 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${inv.color}80, ${inv.color})` }} />
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Current Value</p>
                            <p style={{ fontSize: 17, fontWeight: 700, color: inv.color, letterSpacing: "-0.3px" }}>€{value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>P&L</p>
                            <p style={{ fontSize: 15, fontWeight: 700, color: isUp ? "#2ECC71" : "#FF5A5A" }}>
                              {isUp ? <TrendingUp className="inline w-3 h-3 mr-0.5" /> : <TrendingDown className="inline w-3 h-3 mr-0.5" />}
                              {pnl >= 0 ? "+" : ""}€{Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Return</p>
                            <p style={{ fontSize: 17, fontWeight: 700, color: isUp ? "#2ECC71" : "#FF5A5A", letterSpacing: "-0.3px" }}>{roi >= 0 ? "+" : ""}{roi.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {investments.length === 0 && (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No holdings yet — add your first investment</p>
                </div>
              )}
            </div>
          </LiquidGlassCard>
        </motion.div>

        {/* Allocation chart — takes 1/3 */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          <LiquidGlassCard accentColor="#a78bfa" hover={false}>
            <div className="flex items-center gap-2.5 mb-5">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(167,139,250,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp style={{ width: 16, height: 16, color: "#a78bfa" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Allocation</h3>
            </div>

            {investments.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {investments.map((inv) => <Cell key={inv.id} fill={inv.color} />)}
                    </Pie>
                    <Tooltip content={<GlassTooltip formatter={fmtAllocTooltip} />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-col gap-2.5 mt-4">
                  {investments.map((inv) => {
                    const value = calcCurrentValue(inv);
                    const pct   = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    return (
                      <div key={inv.id} className="flex items-center gap-2">
                        <div style={{ width: 8, height: 8, borderRadius: 3, background: inv.color, flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.name}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", flexShrink: 0 }}>{pct.toFixed(1)}%</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ padding: "40px 0", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No data</p>
              </div>
            )}
          </LiquidGlassCard>
        </motion.div>
      </div>

      <InvestmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingInv(undefined); }}
        onSave={handleSave}
        initial={editingInv}
      />
    </div>
    </ModuleErrorBoundary>
  );
}
