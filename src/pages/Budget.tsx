import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, AlertTriangle, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useBudgetState } from "@/portals/finance/hooks/useBudgetState";
import { useBudgetData } from "@/portals/finance/hooks/useBudgetData";
import { BudgetCategoryPanel } from "@/portals/finance/components/BudgetCategoryPanel";
import { BudgetManagerModal } from "@/portals/finance/components/BudgetManagerModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function barColor(pct: number): string {
  if (pct >= 85) return "#FF5A5A";
  if (pct >= 60) return "#f59e0b";
  return "#2ECC71";
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < 1024);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Pie tooltip ───────────────────────────────────────────────────────────────

function BudgetTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "7px 12px" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{payload[0].name}</p>
      <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>€{(payload[0].value as number).toLocaleString("en-US")}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Budget() {
  const {
    selectedCategory, isPanelOpen, month, year,
    openCategory, closeCategoryPanel, prevMonth, nextMonth,
  } = useBudgetState();

  const { categories, totalBudget, setTotalBudget, updateBudgetLimit } = useBudgetData(month, year);

  const [managerOpen, setManagerOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedCat = categories.find((c) => c.id === selectedCategory) ?? null;

  const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
  const remaining  = totalBudget - totalSpent;

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* ── Summary bar ─────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {[
          { label: "Total Budget",  value: `€${totalBudget.toLocaleString("en-US")}`,  color: "#4A9EFF" },
          { label: "Total Spent",  value: `€${totalSpent.toLocaleString("en-US")}`,    color: totalSpent > totalBudget ? "#FF5A5A" : "#C9A84C" },
          { label: "Remaining",    value: `€${Math.abs(remaining).toLocaleString("en-US")}${remaining < 0 ? " -" : ""}`, color: remaining < 0 ? "#FF5A5A" : "#2ECC71" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 14, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", marginTop: 4 }}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Main grid ───────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Left: Budget Breakdown ──────────────────────────────── */}
        <div className="lg:col-span-2">
          <LiquidGlassCard accentColor="#C9A84C" hover={false}>
            {/* Card header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(201,168,76,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wallet style={{ width: 16, height: 16, color: "#C9A84C" }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Monthly Budget</h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Manage button */}
                <button
                  onClick={() => setManagerOpen(true)}
                  style={{
                    height: 30, padding: "0 10px", borderRadius: 8,
                    background: "rgba(201,168,76,0.10)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: "#C9A84C", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Settings2 style={{ width: 12, height: 12 }} />
                  Manage
                </button>

                {/* Month navigation */}
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                    <ChevronLeft style={{ width: 14, height: 14 }} />
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", minWidth: 110, textAlign: "center" }}>
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {categories.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-tertiary)", fontSize: 13 }}>
                <p style={{ margin: 0 }}>No budget categories.</p>
                <p style={{ margin: "6px 0 0", fontSize: 12 }}>Add expense categories from the Transactions page.</p>
              </div>
            )}

            {/* Category rows */}
            <div className="flex flex-col gap-1">
              {categories.map((cat, i) => {
                const pct       = cat.budget > 0 ? Math.min(100, Math.round((cat.spent / cat.budget) * 100)) : 0;
                const over      = cat.spent > cat.budget;
                const isSelected = selectedCategory === cat.id;
                const bColor    = barColor(pct);

                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => isSelected ? closeCategoryPanel() : openCategory(cat.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      borderLeft: isSelected ? "3px solid #C9A84C" : "3px solid transparent",
                      background: isSelected ? "rgba(201,168,76,0.07)" : "transparent",
                      transition: "all 0.18s ease",
                    }}
                    whileHover={{ scale: 1.005, transition: { duration: 0.15 } }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2" style={{ color: cat.color }}>
                        {cat.icon}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</span>
                        {over && <AlertTriangle style={{ width: 12, height: 12, color: "#FF5A5A" }} />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: 12, fontWeight: 700, color: over ? "#FF5A5A" : "var(--text-primary)" }}>
                          €{cat.spent.toLocaleString("en-US")}
                          <span style={{ fontSize: 10, color: "var(--text-quaternary)", fontWeight: 400 }}> / €{cat.budget.toLocaleString("en-US")}</span>
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: "right", color: over ? "#FF5A5A" : cat.color }}>
                          {pct}%
                        </span>
                      </div>
                    </div>

                    <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <motion.div
                        key={`bar-${cat.id}-${isSelected}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{
                          duration: 0.7,
                          delay: isSelected ? 0 : 0.1 + 0.05 * i,
                          ease: isSelected ? [0.34, 1.56, 0.64, 1] : [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          height: "100%", borderRadius: 99,
                          background: over
                            ? "linear-gradient(90deg,#FF5A5A99,#FF5A5A)"
                            : `linear-gradient(90deg,${bColor}80,${bColor})`,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </LiquidGlassCard>
        </div>

        {/* Right: Pie chart OR BudgetCategoryPanel (desktop) ─────── */}
        <AnimatePresence mode="wait">
          {isPanelOpen && selectedCat && !isMobile ? (
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ minHeight: 400 }}
            >
              <BudgetCategoryPanel
                category={selectedCat}
                month={month}
                year={year}
                onClose={closeCategoryPanel}
              />
            </motion.div>
          ) : (
            <motion.div
              key="pie"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <LiquidGlassCard accentColor="#8b5cf6" hover={false}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Expense Breakdown</h3>
                {categories.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={categories} dataKey="spent" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                          {categories.map((cat) => <Cell key={cat.id} fill={cat.color} opacity={0.85} />)}
                        </Pie>
                        <Tooltip content={<BudgetTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2 mt-2">
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{cat.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>€{cat.spent.toLocaleString("en-US")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 13 }}>
                    No data
                  </div>
                )}
              </LiquidGlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Mobile bottom sheet (portal) ─────────────────────────── */}
      <AnimatePresence>
        {isPanelOpen && selectedCat && isMobile && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          >
            <div onClick={closeCategoryPanel} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70vh", borderRadius: "20px 20px 0 0", overflow: "hidden" }}
            >
              <BudgetCategoryPanel
                category={selectedCat}
                month={month}
                year={year}
                onClose={closeCategoryPanel}
              />
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* ── Budget manager modal ─────────────────────────────────── */}
      <BudgetManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        categories={categories}
        totalBudget={totalBudget}
        onSetTotalBudget={setTotalBudget}
        onUpdateLimit={updateBudgetLimit}
      />
    </div>
  );
}
