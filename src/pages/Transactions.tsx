import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronLeft, ChevronRight, Plus,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, Loader2, ChevronUp, ChevronDown, Trash2,
} from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { AddTransactionModal } from "@/components/finance/AddTransactionModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useFinanceSummary } from "@/hooks/useFinanceSummary";
import { useCategories } from "@/hooks/useCategories";
import { usePortal } from "@/lib/portalContext";
import type { PersonalTransaction, TransactionFilters, CostClassification } from "@/types/finance";
import { PAYMENT_METHOD_LABELS, COST_CLASSIFICATION_CONFIG } from "@/types/finance";

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

function fmtEur(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Tx Row ────────────────────────────────────────────────────────────────────

function TxRow({ tx, onDelete, getCatColor, getCatIcon }: {
  tx: PersonalTransaction;
  onDelete: (id: string) => void;
  getCatColor: (name: string) => string;
  getCatIcon: (name: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isIncome    = tx.type === "income";
  const isTransfer  = tx.type === "transfer";
  const color       = getCatColor(tx.category);
  const icon        = getCatIcon(tx.category);
  const amtColor    = isIncome ? "#4ade80" : isTransfer ? "#C9A84C" : "#FF5A5A";

  return (
    <motion.div layout key={tx.id}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "9px 12px",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
          borderLeft: expanded ? "2px solid #C9A84C" : "2px solid transparent",
          background: expanded ? "rgba(201,168,76,0.04)" : "transparent",
          transition: "background 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
        onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.background = "transparent"; }}
      >
        {/* Category icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: `${color}18`, color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>
          {icon}
        </div>

        {/* Description + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tx.description || tx.category}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>{fmtDate(tx.date)}</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99, background: `${color}18`, color }}>{tx.category}</span>
            {tx.cost_classification && (() => {
              const cfg = COST_CLASSIFICATION_CONFIG[tx.cost_classification];
              return (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: cfg.bgColor, color: cfg.color, letterSpacing: "0.03em" }}>
                  {cfg.label}
                </span>
              );
            })()}
            {tx.payment_method === "crypto" ? (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: "rgba(247,147,26,0.12)", color: "#F7931A", letterSpacing: "0.03em" }}>
                Crypto
              </span>
            ) : tx.payment_method ? (
              <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>{PAYMENT_METHOD_LABELS[tx.payment_method]}</span>
            ) : null}
          </div>
        </div>

        {/* Amount + direction */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${amtColor}18`, display: "flex", alignItems: "center", justifyContent: "center", color: amtColor }}>
            {isIncome ? <ArrowUpRight style={{ width: 11, height: 11 }} /> : isTransfer ? <ArrowLeftRight style={{ width: 11, height: 11 }} /> : <ArrowDownRight style={{ width: 11, height: 11 }} />}
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: amtColor, letterSpacing: "-0.3px" }}>
            {isIncome ? "+" : "-"}${fmtEur(tx.amount)}
          </p>
          {expanded
            ? <ChevronUp style={{ width: 14, height: 14, color: "var(--text-quaternary)" }} />
            : <ChevronDown style={{ width: 14, height: 14, color: "var(--text-quaternary)" }} />
          }
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "8px 12px 10px 58px", background: "var(--glass-bg-subtle)", borderLeft: "2px solid #C9A84C", borderRadius: "0 0 10px 10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", marginBottom: 8 }}>
                {[
                  ["Category",  tx.category],
                  ["Date",       new Date(tx.date + "T00:00:00").toLocaleDateString("en-US")],
                  ["Amount",    `$${fmtEur(tx.amount)}`],
                  tx.subcategory ? ["Subcategory", tx.subcategory] : null,
                  tx.payment_method ? ["Method", PAYMENT_METHOD_LABELS[tx.payment_method] ?? tx.payment_method] : null,
                  tx.is_recurring ? ["Recurring", tx.recurring_interval ?? "yes"] : null,
                ].filter(Boolean).map(([l, v]) => (
                  <div key={l as string}>
                    <p style={{ fontSize: 9, color: "var(--text-quaternary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</p>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "1px 0 0" }}>{v}</p>
                  </div>
                ))}
              </div>
              {tx.tags && tx.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {tx.tags.map((t) => (
                    <span key={t} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: "rgba(201,168,76,0.12)", color: "#C9A84C", fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {confirmDelete ? (
                  <>
                    <span style={{ fontSize: 11, color: "#FF5A5A", fontWeight: 600 }}>Delete?</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(tx.id); setConfirmDelete(false); }}
                      style={{ padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(255,90,90,0.15)", border: "none", color: "#FF5A5A" }}>
                      Yes
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                      style={{ padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "none", color: "var(--text-quaternary)" }}>
                      No
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                    style={{ padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.18)", color: "#FF5A5A", display: "flex", alignItems: "center", gap: 4 }}>
                    <Trash2 style={{ width: 11, height: 11 }} />Delete
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

type TypeFilter = "all" | "income" | "expense" | "transfer";
type ClassFilter = "all" | CostClassification;

export default function Transactions() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year,  setYear]  = useState(now.getFullYear());

  const [typeFilter,  setTypeFilter]  = useState<TypeFilter>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [catFilter,   setCatFilter]   = useState("");
  const [search,      setSearch]      = useState("");
  const [modalOpen,   setModalOpen]   = useState(false);

  const { portal } = usePortal();
  const isBusinessPortal = portal?.id !== "sosa";
  const { allCategories, getCategoryColor, getCategoryIcon } = useCategories();

  const dateRange = useMemo(() => {
    const m  = String(month + 1).padStart(2, "0");
    const ld = new Date(year, month + 1, 0).getDate();
    return { from: `${year}-${m}-01`, to: `${year}-${m}-${String(ld).padStart(2, "0")}` };
  }, [month, year]);

  const filters: TransactionFilters = useMemo(() => ({
    ...(typeFilter  !== "all" && { type: typeFilter }),
    ...(classFilter !== "all" && { costClassification: classFilter }),
    ...(catFilter  && { category: catFilter }),
    ...(search     && { search }),
    dateFrom: dateRange.from,
    dateTo:   dateRange.to,
  }), [typeFilter, classFilter, catFilter, search, dateRange]);

  const { transactions, isLoading, error, addTransaction, deleteTransaction } = useTransactions(filters);
  const { summary } = useFinanceSummary(dateRange);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* ── Summary cards ──────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {[
          { label: "Monthly income",     value: `+$${fmtEur(summary.totalIncome)}`,    color: "#4ade80" },
          { label: "Monthly expenses",   value: `-$${fmtEur(summary.totalExpenses)}`,  color: "#FF5A5A" },
          { label: "Net balance",        value: `${summary.netBalance >= 0 ? "+" : ""}$${fmtEur(summary.netBalance)}`, color: summary.netBalance >= 0 ? "#4ade80" : "#FF5A5A" },
          { label: "Total transactions", value: String(summary.transactionCount),      color: "var(--text-primary)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 14, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", marginTop: 4 }}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── List card ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <LiquidGlassCard accentColor="#C9A84C" hover={false}>
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              {/* Month nav */}
              <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg-subtle)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", minWidth: 150, textAlign: "center" }}>
                {MONTH_NAMES[month]} {year}
              </span>
              <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 8, border: "0.5px solid var(--glass-border)", background: "var(--glass-bg-subtle)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-quaternary)" }} />
                <input className="glass-input" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..." style={{ fontSize: 12, padding: "6px 10px 6px 28px", borderRadius: 8, width: 160 }} />
              </div>
              {/* Add button */}
              <button
                onClick={() => setModalOpen(true)}
                style={{ height: 32, padding: "0 14px", borderRadius: 9, background: "#ffffff", border: "none", color: "#1a1a1a", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <Plus style={{ width: 14, height: 14 }} />
                Add
              </button>
            </div>
          </div>

          {/* Filters bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Type filter */}
            <div className="glass-segment flex">
              {([["all","All"],["income","Income"],["expense","Expenses"],["transfer","Transfers"]] as const).map(([v, l]) => (
                <button key={v} className="glass-segment-item" data-active={typeFilter === v}
                  onClick={() => setTypeFilter(v as TypeFilter)} style={{ whiteSpace: "nowrap", fontSize: 11 }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Classification filter (business portals) */}
            {isBusinessPortal && (
              <div className="glass-segment flex">
                {([["all", "Tutti"], ["revenue", "Revenue"], ["cogs", "COGS"], ["opex", "OPEX"]] as const).map(([v, l]) => {
                  const cfg = v !== "all" ? COST_CLASSIFICATION_CONFIG[v as CostClassification] : null;
                  return (
                    <button key={v} className="glass-segment-item" data-active={classFilter === v}
                      onClick={() => { setClassFilter(v as ClassFilter); }}
                      style={{ whiteSpace: "nowrap", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                      {cfg && <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />}
                      {l}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Category filter */}
            {allCategories.length > 0 && (
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
                className="glass-input" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, minWidth: 120 }}>
                <option value="">All categories</option>
                {allCategories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            )}
          </div>

          {/* Result count */}
          <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 8 }}>
            {transactions.length} transazion{transactions.length === 1 ? "e" : "i"}
            {(classFilter !== "all" || catFilter) ? " (filtrate)" : ""}
          </p>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {isLoading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 8, color: "var(--text-quaternary)" }}>
                <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>Loading...</span>
              </div>
            ) : error ? (
              <p style={{ fontSize: 13, color: "#FF5A5A", textAlign: "center", padding: "28px 0" }}>{error}</p>
            ) : transactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 0" }}>
                <p style={{ fontSize: 13, color: "var(--text-quaternary)" }}>No transactions found</p>
                <button onClick={() => setModalOpen(true)} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 8, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", color: "#C9A84C", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  + Add your first
                </button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {transactions.map((tx, i) => (
                  <motion.div key={tx.id} layout
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: 0.02 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                    <TxRow tx={tx} onDelete={deleteTransaction} getCatColor={getCategoryColor} getCatIcon={getCategoryIcon} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </LiquidGlassCard>
      </motion.div>

      {/* ── Add Transaction Modal ─────────────────────────────── */}
      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addTransaction}
      />
    </div>
  );
}
