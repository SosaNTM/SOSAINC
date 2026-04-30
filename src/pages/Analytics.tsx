import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown, BarChart2, PieChart as PieIcon } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { useFinanceSummary, lastNMonthsRange } from "@/hooks/useFinanceSummary";
import { useTransactions } from "@/hooks/useTransactions";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { GlassTooltip } from "@/components/ui/GlassTooltip";
import type { NewPersonalTransaction } from "@/types/finance";

// â”€â”€ Tooltip formatter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtEurTooltip = (v: number) => `€${Number(v).toLocaleString("en-US")}`;

// NOTE: Custom tooltip — too specialized for GlassTooltip (accesses payload[0].payload.percentage)
function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", borderRadius: 0, padding: "7px 12px" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{payload[0].name}</p>
      <p style={{ fontSize: 11, color: "var(--text-tertiary)", margin: "2px 0 0" }}>
        €{Number(payload[0].value).toLocaleString("en-US")} · {payload[0].payload.percentage}%
      </p>
    </div>
  );
}

// â”€â”€ CSV export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]).join(",");
  const lines   = rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(","));
  const blob    = new Blob([[headers, ...lines].join("\n")], { type: "text/csv" });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Analytics() {
  const [modalOpen, setModalOpen] = useState(false);
  const range6m  = useMemo(() => lastNMonthsRange(6), []);
  const range12m = useMemo(() => lastNMonthsRange(12), []);

  const { summary: s6,  isLoading: l6  } = useFinanceSummary(range6m);
  const { summary: s12, isLoading: l12 } = useFinanceSummary(range12m);
  const { transactions, addTransaction } = useTransactions({ dateFrom: range12m.from, dateTo: range12m.to });

  // Monthly net-balance data for line chart (last 12m)
  const monthlyData = useMemo(() =>
    s12.monthlyBreakdown.map((m) => ({
      name:    m.label,
      income:  Math.round(m.income),
      expenses: Math.round(m.expenses),
      net:     Math.round(m.net),
    })),
  [s12]);

  // Daily spending for current month
  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const day = tx.date.slice(8, 10);
      map[day] = (map[day] ?? 0) + tx.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, amount]) => ({ name: `${parseInt(day)}`, amount: Math.round(amount) }));
  }, [transactions]);

  // Category breakdown pie data (6m)
  const pieData = useMemo(() => s6.categoryBreakdown.slice(0, 8), [s6]);

  // Top 5 categories bar (6m)
  const top5 = useMemo(() => s6.categoryBreakdown.slice(0, 5), [s6]);

  // Monthly table (12m)
  const tableData = useMemo(() =>
    [...s12.monthlyBreakdown].reverse().map((m) => ({
      Month:        m.label,
      Income:       `€${Math.round(m.income).toLocaleString("en-US")}`,
      Expenses:     `€${Math.round(m.expenses).toLocaleString("en-US")}`,
      Net:          `€${Math.round(m.net).toLocaleString("en-US")}`,
      Transactions: m.count,
    })),
  [s12]);

  const stat = (label: string, value: string, color: string, icon: React.ReactNode) => (
    <div style={{ background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", borderRadius: 0, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 0, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: "-0.5px", margin: "2px 0 0" }}>{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* â”€â”€ Header + stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        <div className="flex items-center justify-between mb-4">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>Analytics</h1>
          <button onClick={() => setModalOpen(true)}
            style={{ height: 32, padding: "0 14px", borderRadius: 9, background: "#ffffff", border: "none", color: "#1a1a1a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            + Add Transaction
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stat("Income (6m)", `€${Math.round(s6.totalIncome).toLocaleString("en-US")}`, "#4ade80", <TrendingUp style={{ width: 18, height: 18 }} />)}
          {stat("Expenses (6m)",  `€${Math.round(s6.totalExpenses).toLocaleString("en-US")}`, "#FF5A5A", <TrendingDown style={{ width: 18, height: 18 }} />)}
          {stat("Net (6m)", `${s6.netBalance >= 0 ? "+" : ""}€${Math.round(s6.netBalance).toLocaleString("en-US")}`, s6.netBalance >= 0 ? "#4ade80" : "#FF5A5A", <BarChart2 style={{ width: 18, height: 18 }} />)}
          {stat("Categories", String(s6.categoryBreakdown.length), "#e8ff00", <PieIcon style={{ width: 18, height: 18 }} />)}
        </div>
      </motion.div>

      {/* â”€â”€ Charts row 1: Income vs Expenses + Pie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Bar chart: Entrate vs Uscite (last 6m) */}
        <div className="lg:col-span-2">
          <LiquidGlassCard accentColor="#4ade80" hover={false}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>Income vs Expenses — Last 6 Months</h3>
            {l6 ? (
              <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 13 }}>Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData.slice(-6)} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                  <Tooltip content={<GlassTooltip formatter={fmtEurTooltip} />} />
                  <Bar dataKey="income"   name="Income"   fill="#4ade80" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Bar dataKey="expenses" name="Expenses" fill="#FF5A5A" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </LiquidGlassCard>
        </div>

        {/* Pie chart: spese per categoria (6m) */}
        <LiquidGlassCard accentColor="#8b5cf6" hover={false}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Expenses by Category</h3>
          {l6 || pieData.length === 0 ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 13 }}>
              {l6 ? "Loading..." : "No data"}
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.85} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-1">
                {pieData.slice(0, 5).map((c) => (
                  <div key={c.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: "inline-block", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{c.category}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </LiquidGlassCard>
      </motion.div>

      {/* â”€â”€ Charts row 2: Daily + Top5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Line chart: daily spending (this month) */}
        <LiquidGlassCard accentColor="#e8ff00" hover={false}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Daily Spending (Current Month)</h3>
          {dailyData.length === 0 ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 13 }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip content={<GlassTooltip formatter={fmtEurTooltip} />} />
                <Line type="monotone" dataKey="amount" name="Expenses" stroke="#e8ff00" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </LiquidGlassCard>

        {/* Horizontal bar: top 5 categories (6m) */}
        <LiquidGlassCard accentColor="#ef4444" hover={false}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Top 5 Expense Categories</h3>
          {l6 || top5.length === 0 ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 13 }}>
              {l6 ? "Loading..." : "No data"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={top5.map((c) => ({ name: c.category, amount: Math.round(c.amount) }))} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<GlassTooltip formatter={fmtEurTooltip} />} />
                <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                  {top5.map((c, i) => <Cell key={i} fill={c.color} opacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </LiquidGlassCard>
      </motion.div>

      {/* â”€â”€ Monthly table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
        <LiquidGlassCard accentColor="#64748b" hover={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Monthly Summary — Last 12 Months</h3>
            <button
              onClick={() => exportCSV(tableData, "finance-analytics.csv")}
              style={{ height: 28, padding: "0 10px", borderRadius: 0, background: "rgba(232,255,0,0.10)", border: "1px solid rgba(232,255,0,0.25)", color: "#e8ff00", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <Download style={{ width: 12, height: 12 }} />
              Export CSV
            </button>
          </div>

          {l12 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-quaternary)", fontSize: 13 }}>Loading...</div>
          ) : tableData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-quaternary)", fontSize: 13 }}>No data available</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {["Month", "Income", "Expenses", "Net", "Transactions"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Month" ? "left" : "right", padding: "6px 10px", fontWeight: 700, fontSize: 10, color: "var(--text-quaternary)", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid var(--sosa-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--sosa-border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ padding: "8px 10px", color: "var(--text-primary)", fontWeight: 600 }}>{row.Month}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#4ade80", fontWeight: 600 }}>{row.Income}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "#FF5A5A", fontWeight: 600 }}>{row.Expenses}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: row.Net.startsWith("-") ? "#FF5A5A" : "#4ade80" }}>{row.Net}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-secondary)" }}>{row.Transactions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LiquidGlassCard>
      </motion.div>

      {/* â”€â”€ Add Transaction Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addTransaction}
      />
    </div>
  );
}
