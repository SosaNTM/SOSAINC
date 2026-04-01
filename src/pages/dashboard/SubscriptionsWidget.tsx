import React from "react";
import { motion } from "framer-motion";
import { Zap, Pause, Play } from "lucide-react";
import { LiquidGlassCard } from "@/components/ui/liquid-glass-card";
import { formatEUR } from "@/portals/finance/utils/currency";
import type { DashboardSubscription } from "@/hooks/useDashboardSubscriptions";

/* ── Shared helpers ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: (delay = 0) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Props ───────────────────────────────────────────────────────── */

interface SubscriptionsWidgetProps {
  readonly subs: readonly DashboardSubscription[];
  readonly totalMonthly: number;
  readonly toggleSub: (id: string) => void;
}

/* ── Component ───────────────────────────────────────────────────── */

export function SubscriptionsWidget({ subs, totalMonthly, toggleSub }: SubscriptionsWidgetProps) {
  return (
    <motion.div variants={fadeUp} custom={0.45} initial="hidden" animate="visible">
      <LiquidGlassCard accentColor="#8b5cf6" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap style={{ width: 16, height: 16, color: "#8b5cf6" }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Subscriptions</h3>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 11, color: "var(--text-quaternary)" }}>Monthly active total</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{formatEUR(totalMonthly)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
          {subs.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "var(--glass-bg-subtle, rgba(255,255,255,0.03))", border: `0.5px solid ${sub.active ? sub.color + "30" : "var(--glass-border)"}`, opacity: sub.active ? 1 : 0.5, transition: "all 0.2s ease" }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${sub.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 14 }}>{sub.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.name}</p>
                  <p style={{ fontSize: 10, color: "var(--text-quaternary)", marginTop: 1 }}>{sub.billingDay}th · {sub.category}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{formatEUR(sub.cost)}</p>
                <button
                  type="button"
                  onClick={() => toggleSub(sub.id)}
                  title={sub.active ? "Pause" : "Resume"}
                  style={{ width: 22, height: 22, borderRadius: 6, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: sub.active ? "rgba(46,204,113,0.12)" : "rgba(255,255,255,0.05)", color: sub.active ? "#2ECC71" : "var(--text-quaternary)", transition: "all 0.15s" }}
                >
                  {sub.active ? <Pause style={{ width: 10, height: 10 }} /> : <Play style={{ width: 10, height: 10 }} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </LiquidGlassCard>
    </motion.div>
  );
}
