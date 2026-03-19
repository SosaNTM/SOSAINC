import { useState } from "react";
import { X, Download } from "lucide-react";
import type { Transaction } from "@/lib/transactionStore";

interface Props {
  open: boolean;
  onClose: () => void;
  filtered: Transaction[];
  all: Transaction[];
  hasFilter: boolean;
}

export function ExportModal({ open, onClose, filtered, all, hasFilter }: Props) {
  const [scope, setScope] = useState<"all" | "filtered">(hasFilter ? "filtered" : "all");
  const [dateMode, setDateMode] = useState<"all" | "month" | "custom">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  if (!open) return null;

  const doExport = () => {
    let rows = scope === "filtered" ? filtered : all;
    if (dateMode === "month") {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      rows = rows.filter((r) => r.date.startsWith(ym));
    } else if (dateMode === "custom" && from) {
      rows = rows.filter((r) => r.date >= from && (!to || r.date <= to));
    }
    const header = "Data,Tipo,Descrizione,Categoria,Tipo Costo,Importo\n";
    const body = rows
      .map(
        (r) =>
          `${r.date},${r.type === "income" ? "Entrata" : "Uscita"},"${r.description}",${r.category},${r.costType === "direct" ? "COGS" : r.costType === "indirect" ? "OPEX" : "—"},${r.type === "income" ? r.amount : -r.amount}`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transazioni.csv";
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const pillStyle = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600 as const,
    color: active ? "hsl(160 68% 43%)" : "hsl(var(--muted-foreground))",
    background: active ? "hsl(160 68% 43% / 0.1)" : "rgba(255,255,255,0.04)",
    border: active ? "1px solid hsl(160 68% 43% / 0.2)" : "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer" as const,
    transition: "all 0.3s ease",
  });

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }} />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[420px] glass-card"
        style={{ animation: "fadeInUp 0.3s ease-out", padding: 28, borderRadius: 24 }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.95)" }}>Esporta Transazioni</h2>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
        </div>

        {/* Scope */}
        {hasFilter && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Ambito</label>
            <div className="flex gap-2">
              <button type="button" style={pillStyle(scope === "all")} onClick={() => setScope("all")}>Tutte le transazioni</button>
              <button type="button" style={pillStyle(scope === "filtered")} onClick={() => setScope("filtered")}>Solo filtrate</button>
            </div>
          </div>
        )}

        {/* Date range */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Periodo</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" style={pillStyle(dateMode === "all")} onClick={() => setDateMode("all")}>Tutto</button>
            <button type="button" style={pillStyle(dateMode === "month")} onClick={() => setDateMode("month")}>Questo mese</button>
            <button type="button" style={pillStyle(dateMode === "custom")} onClick={() => setDateMode("custom")}>Personalizzato</button>
          </div>
          {dateMode === "custom" && (
            <div className="flex gap-2 mt-3" style={{ animation: "fadeInUp 0.2s ease-out" }}>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="glass-input px-3 py-2 text-xs text-foreground outline-none flex-1" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="glass-input px-3 py-2 text-xs text-foreground outline-none flex-1" />
            </div>
          )}
        </div>

        <button type="button" onClick={doExport} className="glass-btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2">
          <Download className="h-4 w-4" /> Esporta CSV
        </button>
      </div>
    </>
  );
}
