import React from "react";
import { motion } from "framer-motion";
import { Target, Check, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/lib/portalContext";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import type { DashboardGoal } from "@/hooks/useFinancialGoals";

/* ── Shared helpers ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function CategoryTag({ category, color }: { category: string; color?: string }) {
  const col = color ?? "#8b8b8b";
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: `${col}20`, color: col, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {category}
    </span>
  );
}

function formatDeadline(deadline: string): string {
  if (!deadline) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const d = new Date(deadline + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return deadline;
}

/* ── Props ───────────────────────────────────────────────────────── */

interface GoalsWidgetProps {
  readonly goals: readonly DashboardGoal[];
  readonly netWorth: number;
}

/* ── Component ───────────────────────────────────────────────────── */

export function GoalsWidget({ goals, netWorth }: GoalsWidgetProps) {
  const navigate = useNavigate();
  const { portal } = usePortal();
  const prefix = portal?.routePrefix ?? "";

  return (
    <motion.div variants={fadeUp} custom={0.3} initial="hidden" animate="visible">
      <LiquidGlassCard accentColor="#2ECC71" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(46,204,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target style={{ width: 16, height: 16, color: "#2ECC71" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Goals</h3>
          </div>
          {goals.length > 0 && (
            <button
              type="button"
              onClick={() => navigate(`${prefix}/pl-rules`)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7, border: "1px solid var(--glass-border)", background: "transparent", color: "var(--text-tertiary)", cursor: "pointer" }}
            >
              <Plus style={{ width: 11, height: 11 }} /> New Goal
            </button>
          )}
        </div>

        {goals.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(46,204,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Target style={{ width: 20, height: 20, color: "#2ECC71" }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>No goals yet</p>
            <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginBottom: 14 }}>Set financial goals to track your progress.</p>
            <button
              type="button"
              onClick={() => navigate(`${prefix}/pl-rules`)}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 8, border: "none", background: "rgba(46,204,113,0.15)", color: "#2ECC71", cursor: "pointer" }}
            >
              <Plus style={{ width: 12, height: 12 }} /> Create Goal
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {goals.map((goal, i) => {
            const pct = Math.min(100, Math.max(0, Math.round((netWorth / goal.target) * 100)));
            const remaining = Math.max(0, goal.target - netWorth);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: "16px 18px", borderRadius: 14, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${goal.color}25` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{goal.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CategoryTag category={goal.category} color={goal.color} />
                      {goal.deadline && <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>by {formatDeadline(goal.deadline)}</span>}
                    </div>
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${goal.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pct >= 100 ? <Check style={{ width: 16, height: 16, color: goal.color }} /> : <span style={{ fontSize: 12, fontWeight: 700, color: goal.color }}>{pct}%</span>}
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 10 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.15 + 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${goal.color}99, ${goal.color})` }}
                  />
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Net Worth</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: goal.color }}>{"\u20AC"}{Math.round(netWorth).toLocaleString("en-US")}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Remaining</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{"\u20AC"}{Math.round(remaining).toLocaleString("en-US")}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Target</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>{"\u20AC"}{goal.target.toLocaleString("en-US")}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </LiquidGlassCard>
    </motion.div>
  );
}
