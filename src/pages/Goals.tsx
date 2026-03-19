import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Pencil, Trash2, Check } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { NewGoalModal, type NewGoalData } from "@/components/NewGoalModal";
import { usePortal } from "@/lib/portalContext";

interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  category: string;
  color: string;
  emoji: string;
}

const INITIAL_GOALS: Goal[] = [
  { id: 1, name: "Emergency Fund",  target: 10_000, saved: 6_400, deadline: "Dec 2025", category: "Safety",  color: "#2ECC71", emoji: "🛡️" },
  { id: 2, name: "Japan Trip",      target: 3_500,  saved: 1_100, deadline: "Sep 2025", category: "Travel",  color: "#f59e0b", emoji: "✈️" },
  { id: 3, name: "MacBook Pro M4",  target: 2_499,  saved: 1_820, deadline: "Jun 2025", category: "Tech",    color: "#4A9EFF", emoji: "💻" },
  { id: 4, name: "Road Bike",       target: 1_800,  saved: 650,   deadline: "Jul 2025", category: "Fitness", color: "#ef4444", emoji: "🚴" },
  { id: 5, name: "Home Renovation", target: 8_000,  saved: 2_200, deadline: "Mar 2026", category: "Home",    color: "#C9A84C", emoji: "🏠" },
];

const GOALS_KEY_PREFIX = "finance_goals";

function goalsStorageKey(portalId: string): string {
  return `${GOALS_KEY_PREFIX}_${portalId}`;
}

function loadGoals(portalId: string): Goal[] {
  try {
    const raw = localStorage.getItem(goalsStorageKey(portalId));
    if (raw) return JSON.parse(raw) as Goal[];
    // Legacy migration for sosa portal
    if (portalId === "sosa") {
      const legacy = localStorage.getItem("finance_goals");
      if (legacy) return JSON.parse(legacy) as Goal[];
    }
  } catch {}
  return INITIAL_GOALS;
}

export default function Goals() {
  const { portal } = usePortal();
  const portalId = portal?.id ?? "sosa";

  const [goals, setGoals] = useState<Goal[]>(() => loadGoals(portalId));
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Reload when portal switches
  useEffect(() => {
    setGoals(loadGoals(portalId));
  }, [portalId]);

  // Persist to portal-scoped localStorage
  useEffect(() => {
    localStorage.setItem(goalsStorageKey(portalId), JSON.stringify(goals));
  }, [goals, portalId]);

  function openCreate() {
    setEditingGoal(null);
    setModalOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingGoal(null);
  }

  function handleSave(data: NewGoalData) {
    if (editingGoal) {
      setGoals(prev => prev.map(g => g.id === editingGoal.id ? { ...data, id: g.id } : g));
    } else {
      setGoals(prev => [...prev, { ...data, id: Date.now() }]);
    }
  }

  function deleteGoal(id: number) {
    setGoals(prev => prev.filter(g => g.id !== id));
    setDeleteId(null);
  }

  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved  = goals.reduce((s, g) => s + g.saved, 0);
  const overallPct  = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="space-y-5">
      <LiquidGlassFilter />

      {/* Summary */}
      <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
        {[
          { label: "Total Goals",      value: String(goals.length),                        color: "#4A9EFF" },
          { label: "Total Target",     value: `€${totalTarget.toLocaleString("en-US")}`,   color: "var(--text-primary)" },
          { label: "Total Saved",      value: `€${totalSaved.toLocaleString("en-US")}`,    color: "#2ECC71" },
          { label: "Overall Progress", value: `${overallPct}%`,                             color: "#C9A84C" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)", borderRadius: 14, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: "-0.5px", marginTop: 4 }}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Goals grid */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
        <LiquidGlassCard accentColor="#2ECC71" hover={false}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(46,204,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target style={{ width: 16, height: 16, color: "#2ECC71" }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Financial Goals</h3>
            </div>
            <button type="button" onClick={openCreate} className="glass-btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
              <Plus className="w-3.5 h-3.5" /> New Goal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {goals.map((goal, i) => {
                const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
                const isConfirm = deleteId === goal.id;
                return (
                  <motion.div key={goal.id} layout
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: 0.06 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{ padding: "18px 20px", borderRadius: 16, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${goal.color}25` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span style={{ fontSize: 22 }}>{goal.emoji}</span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{goal.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: `${goal.color}18`, color: goal.color }}>{goal.category}</span>
                            <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>by {goal.deadline}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        {!isConfirm ? (
                          <>
                            <button type="button" title="Edit" onClick={() => openEdit(goal)} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Pencil style={{ width: 11, height: 11 }} />
                            </button>
                            <button type="button" title="Delete" onClick={() => setDeleteId(goal.id)} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,90,90,0.08)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Trash2 style={{ width: 11, height: 11 }} />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: 10, color: "#FF5A5A", marginRight: 2 }}>Delete?</span>
                            <button type="button" onClick={() => deleteGoal(goal.id)} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,90,90,0.2)", color: "#FF5A5A", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check style={{ width: 11, height: 11 }} />
                            </button>
                            <button type="button" onClick={() => setDeleteId(null)} style={{ width: 26, height: 26, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: 0.15 + 0.06 * i, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${goal.color}80, ${goal.color})` }} />
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Saved</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: goal.color, letterSpacing: "-0.3px" }}>€{goal.saved.toLocaleString("en-US")}</p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Progress</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: pct >= 100 ? "#2ECC71" : "var(--text-primary)", letterSpacing: "-0.5px" }}>{pct}%</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 10, color: "var(--text-quaternary)" }}>Target</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>€{goal.target.toLocaleString("en-US")}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </LiquidGlassCard>
      </motion.div>

      <NewGoalModal
        open={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={editingGoal ?? undefined}
      />
    </div>
  );
}
