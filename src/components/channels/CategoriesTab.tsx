import { useState, useMemo } from "react";
import { Plus, X, MoreVertical } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import {
  useCategories, addCategory, updateCategory, deleteCategory,
  categoryIcons, categoryColors, AppCategory,
} from "@/lib/categoryStore";
import { useChannels } from "@/lib/channelStore";
import { fmtEur } from "@/lib/financialCalculations";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { fmtEurShort } from "@/lib/financialCalculations";

/* ── Add/Edit Category Modal ── */
function CategoryModal({ category, onClose }: { category?: AppCategory; onClose: () => void }) {
  const isEdit = !!category;
  const channels = useChannels();
  const [name, setName] = useState(category?.name || "");
  const [type, setType] = useState<"income" | "expense">(category?.type || "income");
  const [costType, setCostType] = useState<"direct" | "indirect">(category?.costType || "direct");
  const [icon, setIcon] = useState(category?.icon || "🛒");
  const [color, setColor] = useState(category?.color || categoryColors[0]);
  const [taxRate, setTaxRate] = useState(category?.taxRate ?? 22);
  const [linkedChannelId, setLinkedChannelId] = useState(category?.linkedChannelId || "");
  const [description, setDescription] = useState(category?.description || "");

  const handleSave = () => {
    if (!name.trim()) return;
    const data: Omit<AppCategory, "id"> = {
      name, type, costType: type === "expense" ? costType : undefined, icon, color, taxRate,
      linkedChannelId: linkedChannelId || undefined, description, enabled: category?.enabled ?? true,
      order: category?.order ?? 99, annualAmount: category?.annualAmount ?? 0,
      monthlyAmounts: category?.monthlyAmounts || Array(12).fill(0),
    };
    if (isEdit) updateCategory(category.id, data);
    else addCategory(data);
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 1000,
        width: "min(520px, 92vw)", maxHeight: "85vh", overflowY: "auto",
        background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(24px)",
        border: "1px solid rgba(255, 255, 255, 0.40)", borderRadius: 22,
        boxShadow: "0 8px 40px rgba(0,0,0,0.12)", padding: 28, animation: "modalIn 0.25s ease",
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
            {isEdit ? "Edit Category" : `+ Add ${type === "income" ? "Income" : "Expense"} Category`}
          </h3>
          <button type="button" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--input-bg)",
            border: "1px solid var(--glass-border)", color: "var(--text-tertiary)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        {/* Name */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Category Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Product Sales" style={{
          width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14, marginBottom: 16,
          background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", outline: "none",
        }} />

        {/* Type + Cost Type */}
        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Type</label>
            <div className="flex gap-2">
              {(["income", "expense"] as const).map(t => (
                <button type="button" key={t} onClick={() => setType(t)} style={{
                  flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: type === t ? "var(--glass-bg)" : "var(--input-bg)",
                  border: type === t ? "1px solid #4A9EFF" : "1px solid var(--glass-border)",
                  color: type === t ? "var(--text-primary)" : "var(--text-tertiary)", transition: "all 0.15s",
                  textTransform: "capitalize",
                }}>{t}</button>
              ))}
            </div>
          </div>
          {type === "expense" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Cost Type</label>
              <div className="flex gap-2">
                {(["direct", "indirect"] as const).map(ct => (
                  <button type="button" key={ct} onClick={() => setCostType(ct)} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: costType === ct ? "var(--glass-bg)" : "var(--input-bg)",
                    border: costType === ct ? "1px solid #4A9EFF" : "1px solid var(--glass-border)",
                    color: costType === ct ? "var(--text-primary)" : "var(--text-tertiary)", transition: "all 0.15s",
                  }}>{ct === "direct" ? "COGS" : "OPEX"}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Icon */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Icon</label>
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
          {categoryIcons.map(ic => (
            <button type="button" key={ic} onClick={() => setIcon(ic)} style={{
              width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: "pointer",
              background: icon === ic ? "var(--glass-bg)" : "var(--input-bg)",
              border: icon === ic ? "1px solid #4A9EFF" : "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
            }}>{ic}</button>
          ))}
        </div>

        {/* Color */}
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Color</label>
        <div className="flex gap-2 flex-wrap" style={{ marginBottom: 16 }}>
          {categoryColors.map(c => (
            <button type="button" key={c} onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: "50%", background: c,
              border: color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Default Tax Rate (%)</label>
            <input type="number" value={taxRate} onChange={e => setTaxRate(+e.target.value)} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", outline: "none",
            }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Linked Channel</label>
            <select value={linkedChannelId} onChange={e => setLinkedChannelId(e.target.value)} style={{
              width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14,
              background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)",
            }}>
              <option value="">All Channels</option>
              {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.icon} {ch.name}</option>)}
            </select>
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{
          width: "100%", padding: "10px 14px", borderRadius: 12, fontSize: 14, resize: "vertical",
          background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", outline: "none", marginBottom: 20,
        }} />

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, background: "var(--input-bg)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={!name.trim()} style={{
            padding: "10px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg, #00D4FF, #4A9EFF)", color: "#fff", border: "none", cursor: name.trim() ? "pointer" : "not-allowed",
            opacity: name.trim() ? 1 : 0.5, transition: "all 0.15s",
          }}>
            {isEdit ? "Update Category" : "Save Category"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Category Detail Panel ── */
function CategoryDetailPanel({ category: cat, allCategories, onClose }: { category: AppCategory; allCategories: AppCategory[]; onClose: () => void }) {
  const totalForType = allCategories.filter(c => c.type === cat.type).reduce((s, c) => s + c.annualAmount, 0);
  const pct = totalForType > 0 ? (cat.annualAmount / totalForType) * 100 : 0;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = months.map((m, i) => ({ month: m, amount: cat.monthlyAmounts[i] || 0 }));
  const best = chartData.reduce((b, d) => d.amount > b.amount ? d : b, chartData[0]);
  const worst = chartData.reduce((w, d) => d.amount < w.amount ? d : w, chartData[0]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease" }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 1000, width: "min(460px, 92vw)",
        background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.40)", boxShadow: "-8px 0 40px rgba(0,0,0,0.10)",
        display: "flex", flexDirection: "column", animation: "slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div className="flex items-center justify-between" style={{ padding: "20px 24px", borderBottom: "1px solid var(--divider)", flexShrink: 0 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{cat.icon} {cat.name} — Detail</h3>
          <button type="button" onClick={onClose} style={{
            width: 32, height: 32, borderRadius: "50%", background: "var(--input-bg)",
            border: "1px solid var(--glass-border)", color: "var(--text-tertiary)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          {/* Summary */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{fmtEur(cat.annualAmount)}</p>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>{pct.toFixed(1)}% of total {cat.type}</p>
          </div>

          {/* Progress */}
          <div style={{ height: 8, background: "var(--glass-bg-subtle)", borderRadius: 4, marginBottom: 20, overflow: "hidden" }} title={`${pct.toFixed(1)}% of total ${cat.type}`}>
            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: cat.color, borderRadius: 4, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: pct > 0 ? `0 0 8px ${cat.color}` : "none" }} />
          </div>

          {/* Monthly chart */}
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>Monthly Breakdown</h4>
          <div style={{ marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickFormatter={v => fmtEurShort(v)} />
                <Tooltip formatter={(v: number) => fmtEur(v)} contentStyle={{
                  background: "rgba(255, 255, 255, 0.85)", border: "1px solid rgba(255, 255, 255, 0.40)", borderRadius: 10, fontSize: 12,
                  backdropFilter: "blur(16px)",
                }} cursor={{ fill: "var(--row-hover)" }} />
                <Bar dataKey="amount" fill={cat.color} radius={[4, 4, 0, 0]}
                  animationDuration={800} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            {[
              { label: "Best Month", value: `${best.month} (${fmtEur(best.amount)})` },
              { label: "Worst Month", value: `${worst.month} (${fmtEur(worst.amount)})` },
              { label: "Monthly Average", value: fmtEur(cat.annualAmount / 12) },
              { label: "Type", value: cat.type === "income" ? "Income" : `Expense (${cat.costType === "direct" ? "COGS" : "OPEX"})` },
              { label: "Tax Rate", value: `${cat.taxRate}%` },
            ].map(s => (
              <div key={s.label} className="flex justify-between" style={{ padding: "8px 0", borderBottom: "1px solid var(--divider)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{s.value}</span>
              </div>
            ))}
          </div>

          <button type="button" style={{
            display: "flex", alignItems: "center", gap: 6, color: "#4A9EFF",
            fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: "none", padding: "8px 0", marginTop: 16,
          }}>
            View All Transactions →
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Category Row ── */
function CategoryRow({ cat, total, onClick }: { cat: AppCategory; total: number; onClick: () => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const pct = total > 0 ? (cat.annualAmount / total) * 100 : 0;

  return (
    <>
      <div onClick={onClick} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
        borderBottom: "1px solid var(--divider)", cursor: "pointer", transition: "all 0.15s", position: "relative",
      }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--row-hover)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {/* Icon */}
        <span style={{
          width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: `${cat.color}20`, border: `1px solid ${cat.color}40`, fontSize: 16, flexShrink: 0,
        }}>{cat.icon}</span>

        {/* Name + bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{cat.name}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{fmtEur(cat.annualAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ flex: 1, height: 5, background: "var(--glass-bg-subtle)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: cat.color, borderRadius: 3, transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", boxShadow: pct > 0 ? `0 0 6px ${cat.color}` : "none" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0, width: 44, textAlign: "right" }}>{pct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Status */}
        <span style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: cat.enabled ? "#22c55e" : "#9ca3af",
        }} />

        {/* Menu */}
        <ActionMenu
          trigger={<MoreVertical size={14} />}
          items={[
            { id: "edit", label: "Edit", onClick: () => setEditOpen(true) },
            { id: "toggle", label: cat.enabled ? "Disable" : "Enable", onClick: () => updateCategory(cat.id, { enabled: !cat.enabled }) },
            { type: "divider" },
            { id: "delete", label: "Delete", onClick: () => deleteCategory(cat.id), destructive: true },
          ]}
        />
      </div>
      {editOpen && <CategoryModal category={cat} onClose={() => setEditOpen(false)} />}
    </>
  );
}

/* ── CATEGORIES TAB ── */
export function CategoriesTab() {
  const categories = useCategories();
  const [addType, setAddType] = useState<"income" | "expense" | null>(null);
  const [detailCat, setDetailCat] = useState<AppCategory | null>(null);

  const incomeCategories = useMemo(() => categories.filter(c => c.type === "income" && c.enabled).sort((a, b) => a.order - b.order), [categories]);
  const expenseCategories = useMemo(() => categories.filter(c => c.type === "expense" && c.enabled).sort((a, b) => a.order - b.order), [categories]);
  const totalIncome = incomeCategories.reduce((s, c) => s + c.annualAmount, 0);
  const totalExpenses = expenseCategories.reduce((s, c) => s + c.annualAmount, 0);

  const renderColumn = (title: string, emoji: string, items: AppCategory[], total: number, type: "income" | "expense") => (
    <div style={{
      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
      borderRadius: 16, backdropFilter: "blur(16px)", overflow: "hidden",
      boxShadow: "var(--glass-shadow)",
    }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--divider)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{emoji} {title}</h3>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
          Total: {fmtEur(total)} · {items.length} categories
        </p>
      </div>
      <div>
        {items.map(cat => (
          <CategoryRow key={cat.id} cat={cat} total={total} onClick={() => setDetailCat(cat)} />
        ))}
        <button type="button" onClick={() => setAddType(type)} style={{
          width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: 8,
          background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)",
          fontSize: 13, fontWeight: 500, transition: "all 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.color = "#4A9EFF"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-tertiary)"}
        >
          <Plus size={16} /> Add {type === "income" ? "Income" : "Expense"} Category
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderColumn("Income Categories", "💰", incomeCategories, totalIncome, "income")}
        {renderColumn("Expense Categories", "📉", expenseCategories, totalExpenses, "expense")}
      </div>

      {addType && <CategoryModal onClose={() => setAddType(null)} />}
      {detailCat && <CategoryDetailPanel category={detailCat} allCategories={categories} onClose={() => setDetailCat(null)} />}
    </div>
  );
}
