// ── DashboardFinanceWidget ─────────────────────────────────────────────────────
// Shows a live finance mini-summary on the Dashboard.
// Uses the Supabase personal_transactions table via useTransactions / useFinanceSummary.
// Falls back gracefully when Supabase isn't configured.

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { AddTransactionModal } from "./AddTransactionModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useFinanceSummary, currentMonthRange } from "@/hooks/useFinanceSummary";
import { GlassTooltip } from "@/components/ui/GlassTooltip";

function fmtEur(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const fmtEurTooltip = (v: number) => `€${Number(v).toLocaleString("en-US")}`;

export function DashboardFinanceWidget() {
  const [modalOpen, setModalOpen] = useState(false);
  const range = currentMonthRange();

  const { summary, isLoading: sumLoading } = useFinanceSummary(range);
  const { transactions: allTxs, addTransaction, isLoading: txLoading } = useTransactions({
    dateFrom: range.from,
    dateTo:   range.to,
  });

  const recentTxs = allTxs.slice(0, 5);

  // Daily spending bar chart data
  const dailyMap: Record<string, number> = {};
  allTxs.filter((t) => t.type === "expense").forEach((t) => {
    const day = parseInt(t.date.slice(8, 10), 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + t.amount;
  });
  const sparkData = Object.entries(dailyMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([day, amount]) => ({ day: parseInt(day, 10), amount: Math.round(amount) }));

  const isLoading = sumLoading || txLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <LiquidGlassCard accentColor="#e8ff00" hover={false}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(232,255,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: 14, height: 14, color: "#e8ff00" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Monthly Finances</span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{ height: 28, padding: "0 10px", borderRadius: 8, background: "#ffffff", border: "none", color: "#1a1a1a", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus style={{ width: 12, height: 12 }} />
            Add
          </button>
        </div>

        {/* Mini summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Income",   value: isLoading ? "—" : `+€${fmtEur(summary.totalIncome)}`,   color: "#4ade80", Icon: TrendingUp },
            { label: "Expenses", value: isLoading ? "—" : `-€${fmtEur(summary.totalExpenses)}`,  color: "#FF5A5A", Icon: TrendingDown },
            { label: "Net",      value: isLoading ? "—" : `${summary.netBalance >= 0 ? "+" : ""}€${fmtEur(summary.netBalance)}`, color: summary.netBalance >= 0 ? "#4ade80" : "#FF5A5A", Icon: summary.netBalance >= 0 ? TrendingUp : TrendingDown },
          ].map(({ label, value, color, Icon }) => (
            <div key={label} style={{ background: "var(--glass-bg-subtle)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <Icon style={{ width: 12, height: 12, color }} />
                <span style={{ fontSize: 10, color: "var(--text-quaternary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color, letterSpacing: "-0.4px", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Main content: transactions left, sparkline right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "start" }}>
          {/* Last 5 transactions */}
          <div>
            {isLoading ? (
              <p style={{ fontSize: 12, color: "var(--text-quaternary)", padding: "8px 0" }}>Loading...</p>
            ) : recentTxs.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-quaternary)", padding: "8px 0" }}>No transactions this month</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {recentTxs.map((tx) => {
                  const isIncome = tx.type === "income";
                  const amtColor = isIncome ? "#4ade80" : "#FF5A5A";
                  return (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, transition: "background 0.12s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: `${amtColor}15`, display: "flex", alignItems: "center", justifyContent: "center", color: amtColor, flexShrink: 0 }}>
                        {isIncome ? <ArrowUpRight style={{ width: 11, height: 11 }} /> : <ArrowDownRight style={{ width: 11, height: 11 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.description || tx.category}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--text-quaternary)", margin: 0 }}>{tx.category}</p>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: amtColor, flexShrink: 0, margin: 0 }}>
                        {isIncome ? "+" : "−"}€{fmtEur(tx.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily spending sparkline */}
          {sparkData.length > 1 && (
            <div style={{ width: 120 }}>
              <p style={{ fontSize: 9, color: "var(--text-quaternary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Daily Spending</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="day" hide />
                  <Tooltip content={<GlassTooltip formatter={fmtEurTooltip} />} />
                  <Bar dataKey="amount" fill="#FF5A5A" opacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </LiquidGlassCard>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addTransaction}
      />
    </motion.div>
  );
}
