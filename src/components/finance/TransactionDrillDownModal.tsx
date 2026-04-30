import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { PersonalTransaction } from "@/types/finance";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  totalAmount: number;
  transactions: PersonalTransaction[];
  isLoading: boolean;
  formatAmount: (n: number) => string;
}

export function TransactionDrillDownModal({ open, onClose, title, totalAmount, transactions, isLoading, formatAmount }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
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
            }}
          />

          {/* Panel */}
          <motion.div
            key="drill-panel"
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={isMobile ? { y: 0 }        : { opacity: 1, scale: 1,    y: 0  }}
            exit={isMobile   ? { y: "100%" }    : { opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed", zIndex: 1001,
              ...(isMobile ? {
                bottom: 0, left: 0, right: 0,
                borderRadius: "16px 16px 0 0",
                maxHeight: "82vh",
              } : {
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(560px, 92vw)",
                maxHeight: "80vh",
                borderRadius: 16,
              }),
              background: "var(--glass-bg-elevated)",
              border: "1px solid var(--glass-border)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
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

            {/* List */}
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
                transactions.map(tx => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 9, marginBottom: 6,
                      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                    }}
                  >
                    {/* Type icon */}
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

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.subcategory ?? tx.description ?? tx.category}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)", margin: 0, fontFamily: "var(--font-mono)" }}>
                        {tx.category} · {new Date(tx.date + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })}
                        {tx.payment_method && ` · ${tx.payment_method.replace("_", " ")}`}
                      </p>
                    </div>

                    {/* Amount */}
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
        </>
      )}
    </AnimatePresence>
  );
}
