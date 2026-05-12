import { FileText } from "lucide-react";
import { LiquidGlassCard, LiquidGlassFilter } from "@/components/ui/liquid-glass-card";
import { motion } from "framer-motion";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";

export default function Invoices() {
  return (
    <ModuleErrorBoundary moduleName="Invoices">
      <div className="space-y-5">
        <LiquidGlassFilter />
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <LiquidGlassCard accentColor="#6b7280" hover={false}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", gap: 16, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(107,114,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText style={{ width: 26, height: 26, color: "var(--text-tertiary)" }} />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.2px", marginBottom: 6 }}>
                  Fatturazione in arrivo
                </p>
                <p style={{ fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.6, maxWidth: 360 }}>
                  Il modulo fatture è in fase di sviluppo e sarà disponibile entro Q3 2026.
                  Sarà possibile creare, inviare e tracciare le fatture direttamente da qui.
                </p>
              </div>
            </div>
          </LiquidGlassCard>
        </motion.div>
      </div>
    </ModuleErrorBoundary>
  );
}
