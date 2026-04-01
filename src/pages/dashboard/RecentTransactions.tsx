import React from "react";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { DashboardTransaction } from "@/hooks/useDashboardTransactions";

/* ── Shared helpers ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function CategoryTag({ category, color, icon }: { category: string; color?: string; icon?: string }) {
  const col = color ?? "#8b8b8b";
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: `${col}20`, color: col, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
      {category}
    </span>
  );
}

/* ── Props ───────────────────────────────────────────────────────── */

interface RecentTransactionsProps {
  readonly transactions: readonly DashboardTransaction[];
  readonly getCategoryColor: (category: string) => string;
  readonly getCategoryIcon: (category: string) => string;
}

/* ── Component ───────────────────────────────────────────────────── */

export function RecentTransactions({ transactions, getCategoryColor, getCategoryIcon }: RecentTransactionsProps) {
  return (
    <motion.div variants={fadeUp} custom={0.6} initial="hidden" animate="visible">
      <LiquidGlassCard accentColor="#e8ff00" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(232,255,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CreditCard style={{ width: 16, height: 16, color: "#e8ff00" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Recent Transactions</h3>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-quaternary)", background: "var(--glass-bg-subtle)", padding: "3px 10px", borderRadius: 20, border: "0.5px solid var(--glass-border)" }}>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No transactions in this period</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-1">
            {transactions.map((tx, i) => {
              const isIncome = tx.amount > 0;
              const catColor = getCategoryColor(tx.category);
              const catIcon = getCategoryIcon(tx.category);
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-between"
                  style={{ padding: "9px 10px", borderRadius: 10, transition: "background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-center gap-3">
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${catColor}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                      {catIcon}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{tx.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>
                          {tx.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                        <CategoryTag category={tx.category} color={catColor} icon={catIcon} />
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.3px", flexShrink: 0, color: isIncome ? "#2ECC71" : "#FF5A5A" }}>
                    {isIncome ? "+" : "-"}{"\u20AC"}{Math.abs(tx.amount).toFixed(2)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </LiquidGlassCard>
    </motion.div>
  );
}
