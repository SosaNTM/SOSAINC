import { useState, useEffect } from "react";
import {
  X, CircleHelp, Users, UserPlus, Package, Monitor, Server, Building2,
  Megaphone, Briefcase, Landmark, Shield, MoreHorizontal, ShoppingCart,
  Wrench, MessageSquare, KeyRound, HelpCircle,
} from "lucide-react";
import type { CostType } from "@/lib/financialCalculations";
import { directCostCategories, indirectCostCategories } from "@/lib/financialCalculations";
import { addTransaction } from "@/lib/transactionStore";
import { usePortal } from "@/lib/portalContext";
import { useFinanceCategories } from "@/hooks/useFinanceCategories";
import type { CostClassification } from "@/types/finance";

const iconMap: Record<string, React.FC<any>> = {
  Users, UserPlus, Package, Monitor, Server, Building2, Megaphone, Briefcase, Landmark, Shield, MoreHorizontal,
};

const incomeCategories = [
  { id: "Sales", label: "Sales", icon: ShoppingCart },
  { id: "Services", label: "Services", icon: Wrench },
  { id: "Consulting", label: "Consulting", icon: MessageSquare },
  { id: "Licensing", label: "Licensing", icon: KeyRound },
  { id: "Other Income", label: "Other", icon: HelpCircle },
];

interface NewTransactionModalProps { open: boolean; onClose: () => void; }

export function NewTransactionModal({ open, onClose }: NewTransactionModalProps) {
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [costType, setCostType] = useState<CostType>("direct");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  // Business portal fields
  const { portal } = usePortal();
  const isBusinessPortal = portal?.id !== "sosa";
  const [costClassification, setCostClassification] = useState<CostClassification>("revenue");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const { getCategoriesByType } = useFinanceCategories();
  const filteredFinanceCategories = getCategoriesByType(costClassification);

  // Auto-select classification when txType changes
  useEffect(() => {
    if (isBusinessPortal) {
      setCostClassification(txType === "income" ? "revenue" : "opex");
      setCategoryId(null);
    }
  }, [txType, isBusinessPortal]);

  // Reset categoryId when classification changes
  useEffect(() => {
    setCategoryId(null);
  }, [costClassification]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const categories = costType === "direct" ? directCostCategories : indirectCostCategories;
  const accentColor = costType === "direct" ? "#34d399" : "#f59e0b";

  const handleSubmit = () => {
    if (!description || !amount || !selectedCategory) return;
    const catLabel = txType === "income" ? selectedCategory
      : [...directCostCategories, ...indirectCostCategories].find((c) => c.id === selectedCategory)?.label || selectedCategory;
    const txData: Parameters<typeof addTransaction>[0] = {
      date: new Date().toISOString().slice(0, 10), type: txType, description,
      category: catLabel, costType: txType === "expense" ? costType : null,
      amount: parseFloat(amount),
    };
    if (isBusinessPortal) {
      (txData as any).cost_classification = costClassification;
      if (categoryId) (txData as any).category_id = categoryId;
    }
    addTransaction(txData);
    setDescription(""); setAmount(""); setSelectedCategory(null);
    setCategoryId(null); onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 glass-modal-overlay" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[480px] glass-modal"
        style={{ animation: "fadeInUp 0.25s ease-out" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", width: "100%", textAlign: "center" }}>New Transaction</h2>
          <button type="button" onClick={onClose} className="absolute top-4 right-4"
            style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--btn-glass-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 14, height: 14, color: "var(--text-secondary)", strokeWidth: 1.7 }} />
          </button>
        </div>

        {/* Type toggle */}
        <div className="mb-5">
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Transaction Type</label>
          <div className="glass-segment flex">
            {(["income", "expense"] as const).map((t) => {
              const isActive = txType === t;
              const color = t === "income" ? "hsl(160 68% 43%)" : "hsl(350 70% 60%)";
              return (
                <button type="button" key={t} onClick={() => { setTxType(t); setSelectedCategory(null); }} className="flex-1 glass-segment-item"
                  style={{ color: isActive ? color : "var(--segment-text)", background: isActive ? `${color.replace(")", " / 0.1)")}` : "transparent" }}>
                  {t === "income" ? "Income" : "Expense"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Title</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={txType === "expense" ? "e.g. Groceries, Rent, Netflix…" : "e.g. Invoice #1248, Client payment"}
            className="glass-input w-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none" autoComplete="off" />
        </div>

        <div className="mb-5">
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Amount (€)</label>
          <input type="number" min="0" max="999999999" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="glass-input w-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
        </div>

        {txType === "income" && (
          <div className="mb-5" style={{ animation: "fadeInUp 0.25s ease-out" }}>
            <label className="text-xs text-muted-foreground font-semibold mb-3 block" style={{ letterSpacing: "0.3px" }}>Category</label>
            <div className="flex flex-wrap gap-2">
              {incomeCategories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button type="button" key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="flex items-center gap-1.5"
                    style={{ padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      color: isSelected ? "hsl(160 68% 43%)" : "var(--text-muted)",
                      background: isSelected ? "hsl(160 68% 43% / 0.1)" : "var(--btn-glass-bg)",
                      border: isSelected ? "1px solid hsl(160 68% 43% / 0.2)" : "0.5px solid var(--btn-glass-border)",
                      transition: "all 0.3s ease" }}>
                    <cat.icon style={{ width: 14, height: 14, strokeWidth: 1.7 }} /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {txType === "expense" && (
          <div className="mb-5" style={{ animation: "fadeInUp 0.25s ease-out" }}>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-xs text-muted-foreground font-semibold" style={{ letterSpacing: "0.3px" }}>Cost Classification</label>
              <div className="relative">
                <button type="button" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <CircleHelp style={{ width: 14, height: 14, strokeWidth: 1.7 }} />
                </button>
                {showTooltip && (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-72 glass-tooltip text-xs leading-relaxed" style={{ animation: "fadeInUp 0.2s ease-out" }}>
                    <p className="font-bold mb-1.5" style={{ color: "var(--tooltip-text)" }}>Direct Costs (COGS):</p>
                    <p style={{ color: "var(--text-secondary)" }} className="mb-2">Costs directly tied to producing your product.</p>
                    <p className="font-bold mb-1.5" style={{ color: "var(--tooltip-text)" }}>Indirect Costs (OPEX):</p>
                    <p style={{ color: "var(--text-secondary)" }}>Overhead costs regardless of sales.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="glass-segment flex">
              {(["direct", "indirect"] as const).map((ct) => {
                const isActive = costType === ct;
                const color = ct === "direct" ? "#34d399" : "#f59e0b";
                return (
                  <button type="button" key={ct} onClick={() => { setCostType(ct); setSelectedCategory(null); }} className="flex-1 glass-segment-item"
                    style={{ color: isActive ? color : "var(--segment-text)", background: isActive ? `${color}1a` : "transparent", borderLeft: isActive ? `3px solid ${color}` : "none" }}>
                    {ct === "direct" ? "Direct Cost (COGS)" : "Indirect Cost (OPEX)"}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon];
                const isSelected = selectedCategory === cat.id;
                return (
                  <button type="button" key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="flex items-center gap-1.5"
                    style={{ padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      color: isSelected ? accentColor : "var(--text-muted)",
                      background: isSelected ? `${accentColor}1a` : "var(--btn-glass-bg)",
                      border: isSelected ? `1px solid ${accentColor}33` : "0.5px solid var(--btn-glass-border)",
                      transition: "all 0.3s ease" }}>
                    {Icon && <Icon style={{ width: 14, height: 14, strokeWidth: 1.7 }} />} {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Business portal: Classification + Category ───── */}
        {isBusinessPortal && (
          <div className="mb-5" style={{ animation: "fadeInUp 0.25s ease-out" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              Classificazione Costo
            </label>
            <select
              className="glass-input w-full px-4 py-3 text-sm text-foreground outline-none"
              value={costClassification}
              onChange={(e) => setCostClassification(e.target.value as CostClassification)}
            >
              <option value="revenue">Ricavo</option>
              <option value="cogs">Costo del Venduto</option>
              <option value="opex">Spesa Operativa</option>
              <option value="other">Altro</option>
            </select>

            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, marginTop: 14, display: "block" }}>
              Categoria
            </label>
            <select
              className="glass-input w-full px-4 py-3 text-sm text-foreground outline-none"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
            >
              <option value="">— Seleziona categoria —</option>
              {filteredFinanceCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="glass-btn flex-1 py-3 text-sm font-semibold text-muted-foreground">Cancel</button>
          <button type="button" onClick={handleSubmit} className="glass-btn-primary flex-1 py-3 text-sm font-semibold" style={{ opacity: !description || !amount || !selectedCategory ? 0.4 : 1 }}>Add Transaction</button>
        </div>
      </div>
    </>
  );
}
