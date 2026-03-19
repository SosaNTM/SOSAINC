import { useState, useMemo } from "react";
import {
  Pencil,
  Copy,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { fmtEur } from "@/lib/financialCalculations";
import {
  getCategoryColor,
  updateTransaction,
  deleteTransaction,
  duplicateTransaction,
  type Transaction,
} from "@/lib/transactionStore";

/* ───── category lists for dropdown ───── */
const incomeCategories = ["Sales", "Services", "Consulting", "Licensing", "Other Income"];
const directCategories = ["Production Staff", "Subcontractors", "Materials & Supplies", "Software Licenses", "Infrastructure"];
const indirectCategories = ["Rent", "Marketing & Ads", "Admin & Management", "Taxes & Contributions", "Utilities & Insurance", "Other"];

interface Props {
  tx: Transaction;
  idx: number;
  isExpanded: boolean;
  onToggle: () => void;
  allTransactions: Transaction[];
  onCategoryClick: (cat: string) => void;
  onCostTypeClick: (ct: "direct" | "indirect") => void;
}

export function TransactionRow({
  tx,
  idx,
  isExpanded,
  onToggle,
  allTransactions,
  onCategoryClick,
  onCostTypeClick,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState("");

  // edit form state
  const [editDesc, setEditDesc] = useState(tx.description);
  const [editAmount, setEditAmount] = useState(String(tx.amount));
  const [editCategory, setEditCategory] = useState(tx.category);
  const [editCostType, setEditCostType] = useState(tx.costType);
  const [editDate, setEditDate] = useState(tx.date);

  const startEdit = () => {
    setEditDesc(tx.description);
    setEditAmount(String(tx.amount));
    setEditCategory(tx.category);
    setEditCostType(tx.costType);
    setEditDate(tx.date);
    setEditing(true);
  };

  const saveEdit = () => {
    updateTransaction(tx.id, {
      description: editDesc,
      amount: parseFloat(editAmount) || tx.amount,
      category: editCategory,
      costType: editCostType,
      date: editDate,
    });
    setEditing(false);
  };

  // context stats
  const context = useMemo(() => {
    const month = tx.date.slice(0, 7);
    const sameCatMonth = allTransactions.filter(
      (t) => t.category === tx.category && t.date.startsWith(month)
    );
    const catTotal = sameCatMonth.reduce((s, t) => s + t.amount, 0);
    const pct = catTotal > 0 ? (tx.amount / catTotal) * 100 : 0;
    const avg =
      sameCatMonth.length > 0
        ? sameCatMonth.reduce((s, t) => s + t.amount, 0) / sameCatMonth.length
        : 0;
    return { catTotal, pct, avg };
  }, [tx, allTransactions]);

  const typeColor =
    tx.type === "income" ? "hsl(160 68% 43%)" : "hsl(350 70% 60%)";
  const catColor = getCategoryColor(tx.category);

  return (
    <>
      {/* Main row */}
      <tr
        className="transition-all duration-300 cursor-pointer"
        style={{
          background: isExpanded
            ? "rgba(255,255,255,0.04)"
            : idx % 2 === 1
            ? "rgba(255,255,255,0.015)"
            : "transparent",
          borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.03)",
          borderLeft: isExpanded
            ? `3px solid ${typeColor}`
            : "3px solid transparent",
        }}
        onClick={() => {
          if (!editing) onToggle();
        }}
        onMouseEnter={(e) => {
          if (!isExpanded)
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          if (!isExpanded)
            e.currentTarget.style.background =
              idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent";
        }}
      >
        <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
          {new Date(tx.date).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </td>
        <td className="px-4 py-3">
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{
              color: typeColor,
              background:
                tx.type === "income"
                  ? "hsl(160 68% 43% / 0.12)"
                  : "hsl(350 70% 60% / 0.12)",
            }}
          >
            {tx.type === "income" ? "Entrata" : "Uscita"}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold text-foreground">
          {tx.description}
        </td>
        <td className="px-4 py-3">
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              color: catColor,
              background: `${catColor}1a`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCategoryClick(tx.category);
            }}
          >
            {tx.category}
          </span>
        </td>
        <td className="px-4 py-3">
          {tx.costType ? (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                color:
                  tx.costType === "direct"
                    ? "hsl(160 68% 43%)"
                    : "hsl(38 92% 55%)",
                background:
                  tx.costType === "direct"
                    ? "hsl(160 68% 43% / 0.12)"
                    : "hsl(38 92% 55% / 0.12)",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onCostTypeClick(tx.costType!);
              }}
            >
              {tx.costType === "direct" ? "COGS" : "OPEX"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td
          className="px-4 py-3 text-sm font-bold"
          style={{ color: typeColor }}
        >
          {tx.type === "income" ? "+" : "-"}
          {fmtEur(tx.amount)}
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr>
          <td
            colSpan={6}
            style={{
              padding: 0,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              borderLeft: `3px solid ${typeColor}`,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                animation: "fadeInUp 0.25s ease-out",
              }}
            >
              {editing ? (
                /* ─── EDIT MODE ─── */
                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrizione</label>
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Importo (€)</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoria</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="glass-input w-full px-3 py-2 text-sm text-foreground outline-none"
                      >
                        <optgroup label="Entrate">
                          {incomeCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Costi Diretti (COGS)">
                          {directCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Costi Indiretti (OPEX)">
                          {indirectCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    {tx.type === "expense" && (
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo Costo</label>
                        <div className="flex gap-2">
                          {(["direct", "indirect"] as const).map((ct) => (
                            <button type="button"
                              key={ct}
                              onClick={() => setEditCostType(ct)}
                              className="glass-btn px-4 py-2 text-xs font-semibold"
                              style={{
                                color:
                                  editCostType === ct
                                    ? ct === "direct"
                                      ? "hsl(160 68% 43%)"
                                      : "hsl(38 92% 55%)"
                                    : "hsl(var(--muted-foreground))",
                                borderColor:
                                  editCostType === ct
                                    ? ct === "direct"
                                      ? "hsl(160 68% 43% / 0.3)"
                                      : "hsl(38 92% 55% / 0.3)"
                                    : "var(--btn-glass-border)",
                                background:
                                  editCostType === ct
                                    ? ct === "direct"
                                      ? "hsl(160 68% 43% / 0.1)"
                                      : "hsl(38 92% 55% / 0.1)"
                                    : "var(--btn-glass-bg)",
                              }}
                            >
                              {ct === "direct" ? "COGS" : "OPEX"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button"
                      onClick={saveEdit}
                      className="glass-btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" /> Salva
                    </button>
                    <button type="button"
                      onClick={() => setEditing(false)}
                      className="glass-btn px-4 py-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
                    >
                      <X className="h-3.5 w-3.5" /> Annulla
                    </button>
                  </div>
                </div>
              ) : (
                /* ─── VIEW MODE ─── */
                <div
                  className="flex flex-col lg:flex-row gap-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* LEFT 60% */}
                  <div className="lg:w-[60%] space-y-3">
                    <p
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {tx.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(tx.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span>·</span>
                      <span
                        className="font-bold px-2 py-0.5 rounded-full"
                        style={{ color: catColor, background: `${catColor}1a` }}
                      >
                        {tx.category}
                      </span>
                      {tx.costType && (
                        <span
                          className="font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color:
                              tx.costType === "direct"
                                ? "hsl(160 68% 43%)"
                                : "hsl(38 92% 55%)",
                            background:
                              tx.costType === "direct"
                                ? "hsl(160 68% 43% / 0.12)"
                                : "hsl(38 92% 55% / 0.12)",
                          }}
                        >
                          {tx.costType === "direct" ? "COGS" : "OPEX"}
                        </span>
                      )}
                    </div>

                    {/* P&L impact line */}
                    {tx.type === "expense" && (
                      <p
                        className="text-xs"
                        style={{
                          color: "rgba(255,255,255,0.45)",
                          fontStyle: "italic",
                        }}
                      >
                        Questo costo impatta il tuo →{" "}
                        <span className="font-bold" style={{ color: tx.costType === "direct" ? "hsl(160 68% 43%)" : "hsl(217 91% 60%)" }}>
                          {tx.costType === "direct"
                            ? "Utile Lordo"
                            : "EBIT"}
                        </span>
                      </p>
                    )}

                    {/* Notes */}
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Aggiungi una nota..."
                      className="glass-input w-full px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
                      style={{ minHeight: 60, resize: "vertical" }}
                    />
                  </div>

                  {/* RIGHT 40% */}
                  <div className="lg:w-[40%] space-y-4">
                    <p
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: typeColor,
                      }}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {fmtEur(tx.amount)}
                    </p>

                    {/* Context card */}
                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "0.5px solid rgba(255,255,255,0.08)",
                        borderRadius: 14,
                        padding: "14px 16px",
                      }}
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        Questa transazione rappresenta il{" "}
                        <span className="font-bold text-foreground">
                          {context.pct.toFixed(1)}%
                        </span>{" "}
                        del {tx.category} totale di questo mese
                      </p>
                      {/* Progress bar */}
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(context.pct, 100)}%`,
                            background: catColor,
                            borderRadius: 3,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Media transazioni {tx.category}:{" "}
                        <span className="font-bold text-foreground">
                          {fmtEur(context.avg)}
                        </span>
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button type="button"
                        onClick={startEdit}
                        className="glass-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        <Pencil className="h-3 w-3" /> Modifica
                      </button>
                      <button type="button"
                        onClick={() => duplicateTransaction(tx.id)}
                        className="glass-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted-foreground"
                      >
                        <Copy className="h-3 w-3" /> Duplica
                      </button>
                      {!confirmDelete ? (
                        <button type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="glass-btn flex items-center gap-1.5 px-3 py-2 text-xs font-semibold"
                          style={{ color: "hsl(350 70% 60%)" }}
                        >
                          <Trash2 className="h-3 w-3" /> Elimina
                        </button>
                      ) : (
                        <div className="flex items-center gap-2" style={{ animation: "fadeInUp 0.2s ease-out" }}>
                          <span className="text-xs text-muted-foreground">Sei sicuro?</span>
                          <button type="button"
                            onClick={() => deleteTransaction(tx.id)}
                            className="glass-btn px-3 py-1.5 text-xs font-bold"
                            style={{ color: "hsl(350 70% 60%)", borderColor: "hsl(350 70% 60% / 0.3)" }}
                          >
                            Conferma
                          </button>
                          <button type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="glass-btn px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                          >
                            Annulla
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Close button */}
                    <button type="button"
                      onClick={onToggle}
                      className="glass-btn px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
