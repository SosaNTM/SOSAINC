import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface SettingsDeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  isLoading?: boolean;
}

export function SettingsDeleteConfirm({
  open, onClose, onConfirm, title, message, itemName, isLoading,
}: SettingsDeleteConfirmProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 110,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)" }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "relative", zIndex: 1, width: "90%", maxWidth: 400,
              background: "var(--glass-bg-elevated)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              padding: "32px 28px",
              textAlign: "center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle style={{ width: 26, height: 26, color: "var(--color-error)" }} />
            </div>

            <h3 style={{
              fontFamily: "var(--font-body)", fontSize: 17, fontWeight: 600,
              color: "var(--text-primary)", marginBottom: 8,
            }}>{title}</h3>

            <p style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-secondary)", lineHeight: 1.6,
            }}>
              {message}
              {itemName && (
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}> "{itemName}"</span>
              )}
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, height: 40,
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 10,
                  fontSize: 13, fontWeight: 500,
                  color: "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--glass-bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--glass-bg)")}
              >Annulla</button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  flex: 1, height: 40,
                  background: "rgba(239,68,68,0.9)", border: "none",
                  borderRadius: 10,
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: isLoading ? "default" : "pointer",
                  fontFamily: "var(--font-body)",
                  opacity: isLoading ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "filter 0.15s",
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
              >
                {isLoading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
