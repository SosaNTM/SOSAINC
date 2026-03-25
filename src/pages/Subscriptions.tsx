import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pause, Play, Zap, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { addAuditEntry } from "@/lib/adminStore";
import { localAdd, localGetAll } from "@/lib/personalTransactionStore";
import { broadcastFinanceUpdate } from "@/lib/financeRealtime";
import {
  type Subscription,
  BILLING_CYCLE_LABELS,
  calculateNextBillingDate,
  getFirstBillingDateFromStart,
  daysUntilBilling,
  toMonthlyAmount,
} from "@/portals/finance/services/subscriptionCycles";
import { useSubscriptionProcessor } from "@/portals/finance/hooks/useSubscriptionProcessor";
import {
  NewSubscriptionModal,
  type NewSubFormData,
} from "@/portals/finance/components/NewSubscriptionModal";

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = "finance_subscriptions";

function subsStorageKey(portalId: string): string {
  return `${STORAGE_KEY_PREFIX}_${portalId}`;
}

const INITIAL_SUBS: Subscription[] = [];

function loadSubs(portalId: string): Subscription[] {
  try {
    const raw = localStorage.getItem(subsStorageKey(portalId));
    if (raw) return JSON.parse(raw) as Subscription[];
    // Legacy migration for sosa portal
    if (portalId === "sosa") {
      const legacy = localStorage.getItem("finance_subscriptions");
      if (legacy) return JSON.parse(legacy) as Subscription[];
    }
  } catch {}
  return INITIAL_SUBS;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatus(sub: Subscription): "active" | "due_soon" | "overdue" | "inactive" {
  if (!sub.is_active) return "inactive";
  const days = daysUntilBilling(sub);
  if (days < 0) return "overdue";
  if (days <= 3) return "due_soon";
  return "active";
}

function SubTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 8, padding: "7px 12px" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{payload[0].name}</p>
      <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>€{(payload[0].value as number).toFixed(2)}/mo</p>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastList({ toasts }: { toasts: { id: string; msg: string }[] }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9998, display: "flex", flexDirection: "column", gap: 8 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            style={{ background: "rgba(17,17,17,0.97)", border: "1px solid rgba(201,169,110,0.3)", borderRadius: 10, padding: "11px 16px", fontSize: 13, color: "#fff", maxWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Subscriptions() {
  const { user } = useAuth();
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [subs, setSubs] = useState<Subscription[]>(() => loadSubs(portalId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  // Reload when portal switches
  useEffect(() => {
    setSubs(loadSubs(portalId));
  }, [portalId]);

  // Persist to portal-scoped localStorage
  useEffect(() => {
    localStorage.setItem(subsStorageKey(portalId), JSON.stringify(subs));
  }, [subs, portalId]);

  // Close context menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  // Toast helper
  const addToast = useCallback((msg: string) => {
    const id = String(Date.now());
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  // Auto-process overdue subscriptions on mount
  useSubscriptionProcessor(subs, setSubs, user?.id ?? null, addToast, portalId);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const visibleSubs = subs.filter((s) => !s.deleted_at);
  const activeSubs  = visibleSubs.filter((s) => s.is_active);

  // Normalize all cycles to monthly equivalent
  const totalMonthly = activeSubs.reduce((acc, s) => acc + toMonthlyAmount(s), 0);
  const totalAnnual  = totalMonthly * 12;

  // Compute balance from personal transactions to detect insufficient funds
  const balance = localGetAll(portalId)
    .filter(() => true) // portal-shared: all portal transactions
    .reduce(
      (acc: number, t) => (t.type === "income" ? acc + Number(t.amount) : acc - Number(t.amount)),
      0,
    );

  // Pie chart data
  const catMap: Record<string, { value: number; color: string }> = {};
  activeSubs.forEach((s) => {
    const monthly = toMonthlyAmount(s);
    if (!catMap[s.category]) catMap[s.category] = { value: 0, color: s.color ?? "#6b7280" };
    catMap[s.category].value += monthly;
  });
  const catData = Object.entries(catMap).map(([name, d]) => ({ name, value: d.value, color: d.color }));

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingSub(null);
    setIsModalOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditingSub(sub);
    setIsModalOpen(true);
    setOpenMenuId(null);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingSub(null);
  }

  function handleSave(data: NewSubFormData) {
    if (editingSub) {
      // Update existing
      setSubs((prev) =>
        prev.map((s) =>
          s.id === editingSub.id
            ? { ...s, ...data, updated_at: new Date().toISOString() }
            : s,
        ),
      );
      addToast(`✓ ${data.name} updated`);
    } else {
      // Compute first billing date
      const firstBilling = getFirstBillingDateFromStart(data.start_date, data.billing_day);
      const startDate = new Date(data.start_date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const next_billing_date = firstBilling
        ? firstBilling.toISOString().slice(0, 10)
        : data.start_date;

      const newSub: Subscription = {
        ...data,
        id: crypto.randomUUID(),
        next_billing_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSubs((prev) => [...prev, newSub]);

      // Process immediately if start_date is today or past
      if (startDate <= today && user) {
        localAdd(
          {
            user_id: user.id,
            type: "expense",
            amount: data.amount,
            currency: data.currency ?? "EUR",
            category: data.category,
            description: `Subscription: ${data.name}`,
            date: today.toISOString().slice(0, 10),
            is_recurring: true,
            recurring_interval: "monthly",
          },
          user.id,
          portalId,
        );
        broadcastFinanceUpdate("transaction_added");

        // Advance next_billing_date past today
        const nextDate = calculateNextBillingDate(
          firstBilling ?? today,
          data.billing_cycle,
          data.billing_day,
        );
        setSubs((prev) =>
          prev.map((s) =>
            s.id === newSub.id
              ? { ...s, next_billing_date: nextDate.toISOString().slice(0, 10) }
              : s,
          ),
        );

        addToast(
          `✓ ${data.name} added — first charge €${data.amount.toFixed(2)} recorded`,
        );
      } else {
        addToast(
          `✓ ${data.name} added — first charge on ${firstBilling?.toLocaleDateString("en-US", { day: "numeric", month: "long" }) ?? data.start_date}`,
        );
      }
      if (user) addAuditEntry({ userId: user.id, action: `Added subscription "${data.name}" — €${data.amount.toFixed(2)}/${data.billing_cycle}`, category: "finance", details: "", icon: "💳", portalId });
    }
    if (editingSub && user) addAuditEntry({ userId: user.id, action: `Updated subscription "${data.name}"`, category: "finance", details: "", icon: "✏️", portalId });
    closeModal();
  }

  function togglePause(id: string) {
    const sub = subs.find(s => s.id === id);
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));
    setOpenMenuId(null);
    if (user && sub) addAuditEntry({ userId: user.id, action: `${sub.is_active ? "Paused" : "Resumed"} subscription "${sub.name}"`, category: "finance", details: "", icon: sub.is_active ? "⏸️" : "▶️", portalId });
  }

  function softDelete(id: string) {
    const sub = subs.find(s => s.id === id);
    setSubs((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, is_active: false, deleted_at: new Date().toISOString() } : s,
      ),
    );
    setDeleteConfirmId(null);
    setOpenMenuId(null);
    if (user && sub) addAuditEntry({ userId: user.id, action: `Deleted subscription "${sub.name}"`, category: "finance", details: "", icon: "🗑️", portalId });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />
      <ToastList toasts={toasts} />

      {/* ── Summary stats ── */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {[
          { label: "Active",           value: String(activeSubs.length),                                        color: "#4A9EFF" },
          { label: "Monthly Total",   value: `€${totalMonthly.toFixed(2)}`,                                    color: "#C9A84C" },
          { label: "Annual Cost",     value: `€${totalAnnual.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "#FF5A5A" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 14, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", marginTop: 4 }}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Main grid ── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Subscription list ── */}
        <div className="lg:col-span-2">
          <LiquidGlassCard accentColor="#8b5cf6" hover={false}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap style={{ width: 16, height: 16, color: "#8b5cf6" }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Subscriptions</h3>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="glass-btn-primary flex items-center gap-1.5"
                style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}
              >
                <Plus className="w-3.5 h-3.5" /> New Subscription
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <AnimatePresence>
                {visibleSubs.map((sub, i) => {
                  const status = getStatus(sub);
                  const days = daysUntilBilling(sub);
                  const monthlyEq = toMonthlyAmount(sub);
                  const isMenu = openMenuId === sub.id;
                  const isDeleteConfirm = deleteConfirmId === sub.id;
                  const insufficientBalance = sub.is_active && balance < sub.amount;

                  return (
                    <motion.div key={sub.id}
                      layout
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        padding: "14px 16px", borderRadius: 14,
                        background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))",
                        border: `0.5px solid ${sub.is_active ? (sub.color ?? "#6b7280") + "30" : "var(--glass-border)"}`,
                        opacity: sub.is_active ? 1 : 0.45,
                        position: "relative",
                      }}
                    >
                      {/* ── Card header ── */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: emoji + name + meta */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${sub.color ?? "#6b7280"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            {sub.icon}
                          </div>
                          <div className="min-w-0">
                            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{sub.name}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              {/* Category badge */}
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 99, background: `${sub.color ?? "#6b7280"}18`, color: sub.color ?? "#6b7280", flexShrink: 0 }}>
                                {sub.category}
                              </span>
                              {/* Cycle */}
                              <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>
                                {BILLING_CYCLE_LABELS[sub.billing_cycle]}
                              </span>
                              {/* Next billing */}
                              {sub.is_active && (
                                <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>
                                  · {new Date(sub.next_billing_date + "T00:00:00").toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: amount + status badges + menu */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                              €{sub.amount.toFixed(2)}
                              <span style={{ fontSize: 10, color: "var(--text-quaternary)", fontWeight: 400 }}>
                                /{BILLING_CYCLE_LABELS[sub.billing_cycle].toLowerCase().slice(0, 2)}
                              </span>
                            </p>
                            {sub.billing_cycle !== "monthly" && (
                              <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>
                                ≈ €{monthlyEq.toFixed(2)}/mo
                              </p>
                            )}
                          </div>

                          {/* Status badge */}
                          {status === "active" && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(46,204,113,0.12)", color: "#2ECC71", whiteSpace: "nowrap" }}>
                              Active
                            </span>
                          )}
                          {status === "due_soon" && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(245,158,11,0.15)", color: "#f59e0b", whiteSpace: "nowrap" }}>
                              {days === 0 ? "Today" : `In ${days}d`}
                            </span>
                          )}
                          {status === "overdue" && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(255,90,90,0.12)", color: "#FF5A5A", whiteSpace: "nowrap" }}>
                              Overdue
                            </span>
                          )}
                          {status === "inactive" && (
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", whiteSpace: "nowrap" }}>
                              Paused
                            </span>
                          )}

                          {/* Context menu button */}
                          {isDeleteConfirm ? (
                            <div className="flex items-center gap-1">
                              <span style={{ fontSize: 10, color: "#FF5A5A" }}>Delete?</span>
                              <button type="button" onClick={() => softDelete(sub.id)}
                                style={{ padding: "3px 8px", fontSize: 10, borderRadius: 6, border: "none", background: "rgba(255,90,90,0.2)", color: "#FF5A5A", cursor: "pointer" }}>
                                Yes
                              </button>
                              <button type="button" onClick={() => setDeleteConfirmId(null)}
                                style={{ padding: "3px 8px", fontSize: 10, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer" }}>
                                No
                              </button>
                            </div>
                          ) : (
                            <div style={{ position: "relative" }}>
                              <button type="button"
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(isMenu ? null : sub.id); }}
                                style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <MoreHorizontal style={{ width: 13, height: 13 }} />
                              </button>
                              {isMenu && (
                                <div onClick={(e) => e.stopPropagation()}
                                  style={{ position: "absolute", right: 0, top: 34, zIndex: 50, background: "var(--glass-bg, rgba(20,20,20,0.97))", border: "0.5px solid var(--glass-border)", borderRadius: 10, padding: 4, minWidth: 150, boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
                                  <button type="button" onClick={() => openEdit(sub)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, textAlign: "left" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <Pencil style={{ width: 12, height: 12 }} /> Edit
                                  </button>
                                  <button type="button" onClick={() => togglePause(sub.id)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, textAlign: "left" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    {sub.is_active
                                      ? <><Pause style={{ width: 12, height: 12 }} /> Pause</>
                                      : <><Play  style={{ width: 12, height: 12 }} /> Resume</>
                                    }
                                  </button>
                                  <div style={{ height: "0.5px", background: "var(--glass-border)", margin: "3px 8px" }} />
                                  <button type="button" onClick={() => { setDeleteConfirmId(sub.id); setOpenMenuId(null); }}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 7, border: "none", background: "transparent", color: "#FF5A5A", cursor: "pointer", fontSize: 12, textAlign: "left" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,90,90,0.08)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                                    <Trash2 style={{ width: 12, height: 12 }} /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Insufficient balance warning */}
                      {insufficientBalance && (
                        <p style={{ fontSize: 10.5, color: "#f59e0b", marginTop: 8, paddingTop: 8, borderTop: "0.5px solid rgba(245,158,11,0.15)" }}>
                          ⚠ Insufficient balance at charge time (balance: €{balance.toFixed(2)})
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {visibleSubs.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-quaternary)", fontSize: 13 }}>
                  No subscriptions. Click "New Subscription" to get started.
                </div>
              )}
            </div>
          </LiquidGlassCard>
        </div>

        {/* ── Pie chart ── */}
        <LiquidGlassCard accentColor="#C9A84C" hover={false}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>By Category</h3>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                  {catData.map((d, i) => <Cell key={i} fill={d.color} opacity={0.88} />)}
                </Pie>
                <Tooltip content={<SubTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-quaternary)", fontSize: 12 }}>
              No data
            </div>
          )}
          <div className="flex flex-col gap-2 mt-3">
            {catData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>€{d.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "0.5px solid var(--glass-border)" }}>
            <div className="flex justify-between">
              <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Monthly (norm.)</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#C9A84C" }}>€{totalMonthly.toFixed(2)}/mo</span>
            </div>
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: 12, color: "var(--text-quaternary)" }}>Annual</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>€{totalAnnual.toFixed(2)}</span>
            </div>
          </div>
        </LiquidGlassCard>
      </motion.div>

      {/* ── Modal ── */}
      <NewSubscriptionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={
          editingSub
            ? {
                name: editingSub.name,
                icon: editingSub.icon ?? "🎬",
                amount: editingSub.amount,
                currency: editingSub.currency,
                billing_cycle: editingSub.billing_cycle,
                billing_day: editingSub.billing_day,
                start_date: editingSub.start_date,
                category: editingSub.category,
                description: editingSub.description ?? "",
                color: editingSub.color ?? "#c9a96e",
                is_active: editingSub.is_active,
              }
            : undefined
        }
      />
    </div>
  );
}
