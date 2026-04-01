import React from "react";
import { motion } from "framer-motion";
import { Target, Check } from "lucide-react";
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

/* ── Props ───────────────────────────────────────────────────────── */

interface GoalsWidgetProps {
  readonly goals: readonly DashboardGoal[];
}

/* ── Component ───────────────────────────────────────────────────── */

export function GoalsWidget({ goals }: GoalsWidgetProps) {
  return (
    <motion.div variants={fadeUp} custom={0.3} initial="hidden" animate="visible">
      <LiquidGlassCard accentColor="#2ECC71" hover={false}>
        <div className="flex items-center gap-2.5 mb-4">
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(46,204,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target style={{ width: 16, height: 16, color: "#2ECC71" }} />
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Goals</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {goals.map((goal, i) => {
            const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
            const remaining = goal.target - goal.saved;
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
                      <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>by {goal.deadline}</span>
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
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Saved</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: goal.color }}>{"\u20AC"}{goal.saved.toLocaleString("en-US")}</p>
                  </div>
                  <div className="text-right">
                    <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Remaining</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{"\u20AC"}{remaining.toLocaleString("en-US")}</p>
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
      </LiquidGlassCard>
    </motion.div>
  );
}
