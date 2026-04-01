import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { useBudgetCategoryTransactions } from "../hooks/useBudgetCategoryTransactions";
import type { PersonalTransaction } from "@/types/finance";

export interface BudgetCategoryDef {
  id: string;
  name: string;
  budget: number;
  spent: number;
  color: string;
  icon: React.ReactNode;
}

interface Props {
  category: BudgetCategoryDef;
  month: number;
  year: number;
  onClose: () => void;
}

type TxFilter = "all" | "expenses" | "income";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function barColor(pct: number): string {
  if (pct >= 85) return "#FF5A5A";
  if (pct >= 60) return "#f59e0b";
  return "#2ECC71";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    day: "2-digit", month: "short",
  });
}

function TxRow({ tx, isExpanded, onToggle }: { tx: PersonalTransaction; isExpanded: boolean; onToggle: () => void }) {
  const isIncome = tx.type === "income";
  return (
    <motion.div layout key={tx.id}>
      <div
        onClick={onToggle}
        style={{
          padding: "9px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderLeft: isExpanded ? "2px solid #e8ff00" : "2px solid transparent",
          background: isExpanded ? "rgba(232,255,0,0.06)" : "transparent",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          background: isIncome ? "rgba(46,204,113,0.10)" : "rgba(255,90,90,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: isIncome ? "#16a34a" : "#dc2626",
        }}>
          {isIncome
            ? <ArrowUpRight   style={{ width: 14, height: 14 }} />
            : <ArrowDownRight style={{ width: 14, height: 14 }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tx.description}
          </p>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>{formatDate(tx.date)}</p>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: isIncome ? "#16a34a" : "#111827", flexShrink: 0 }}>
          {isIncome ? "+" : "−"}€{tx.amount.toLocaleString("en-US")}
        </span>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              padding: "8px 16px 12px 58px",
              background: "#f9fafb",
              borderLeft: "2px solid #e8ff00",
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                {[
                  ["Category",  tx.category],
                  ["Type",      isIncome ? "Income" : tx.type === "transfer" ? "Transfer" : "Expense"],
                  ["Date",      new Date(tx.date + "T00:00:00").toLocaleDateString("en-US")],
                  ["Amount",    `€${tx.amount.toLocaleString("en-US")}`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                    <p style={{ fontSize: 11, color: "#374151", margin: "1px 0 0" }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const BudgetCategoryPanel = React.memo(function BudgetCategoryPanel({ category, month, year, onClose }: Props) {
  const [filter, setFilter]   = useState<TxFilter>("all");
  const [search, setSearch]   = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 200);

  const { transactions, isLoading } = useBudgetCategoryTransactions(category.id, category.name, month, year);

  const pct   = Math.min(100, Math.round((category.spent / category.budget) * 100));
  const over  = category.spent > category.budget;
  const color = barColor(pct);

  const displayed = transactions
    .filter((t) => {
      if (filter === "income")   return t.type === "income";
      if (filter === "expenses") return t.type === "expense";
      return true;
    })
    .filter((t) => {
      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();
      return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    });

  const displayedExpenseTotal = displayed
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "#ffffff",
      borderRadius: 16,
      border: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `${category.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: category.color,
            }}>
              {category.icon}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{category.name}</p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                {MONTH_NAMES[month]} {year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: "#f3f4f6",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6b7280",
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: "#6b7280" }}>Spent</span>
          <span style={{ fontWeight: 700, color: over ? "#dc2626" : "#111827" }}>
            €{category.spent.toLocaleString("en-US")}
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>
              {" "}/ €{category.budget.toLocaleString("en-US")}
            </span>
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: "#f3f4f6", overflow: "hidden" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: "100%", borderRadius: 99,
              background: over
                ? "linear-gradient(90deg,#FF5A5A99,#dc2626)"
                : `linear-gradient(90deg,${color}80,${color})`,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "#9ca3af" }}>
          <span>{pct}% used</span>
          <span style={{ color: over ? "#dc2626" : "#16a34a" }}>
            {over
              ? `€${(category.spent - category.budget).toLocaleString("en-US")} over`
              : `€${(category.budget - category.spent).toLocaleString("en-US")} remaining`
            }
          </span>
        </div>
      </div>

      {/* ── Filters + Search ────────────────────────────────────── */}
      <div style={{
        padding: "10px 16px 8px",
        display: "flex", gap: 6, alignItems: "center",
        borderBottom: "1px solid #f3f4f6",
      }}>
        {(["all", "expenses", "income"] as TxFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "4px 10px", borderRadius: 20,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: filter === f ? "1px solid #e8ff00" : "1px solid #e5e7eb",
              background: filter === f ? "rgba(232,255,0,0.10)" : "transparent",
              color: filter === f ? "#b8cc00" : "#6b7280",
              textTransform: "capitalize",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {f}
          </button>
        ))}
        <div style={{ flex: 1, position: "relative" }}>
          <Search style={{
            position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
            width: 11, height: 11, color: "#9ca3af", pointerEvents: "none",
          }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%", height: 28,
              paddingLeft: 24, paddingRight: 8,
              borderRadius: 8,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              color: "#111827", fontSize: 11, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* ── Transaction List ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "28px 16px", color: "#9ca3af", fontSize: 13 }}>
            Loading...
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px" }}>
            <Receipt style={{ width: 32, height: 32, color: "#d1d5db", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No transactions</p>
            <p style={{ fontSize: 11, color: "#d1d5db", margin: "4px 0 0" }}>
              for {MONTH_NAMES[month]} {year}
            </p>
          </div>
        ) : (
          displayed.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              isExpanded={expandedId === tx.id}
              onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
            />
          ))
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      {displayed.length > 0 && (
        <div style={{
          padding: "10px 16px",
          borderTop: "1px solid #f3f4f6",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {displayed.length} transaction{displayed.length === 1 ? "" : "s"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
            −€{displayedExpenseTotal.toLocaleString("en-US")}
          </span>
        </div>
      )}
    </div>
  );
});
