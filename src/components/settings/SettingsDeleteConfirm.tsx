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
        }}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "absolute", inset: 0,
              background: "var(--modal-overlay)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "relative", zIndex: 1, width: "90%", maxWidth: 400,
              background: "var(--glass-bg-elevated)",
              backdropFilter: "var(--glass-blur-heavy)",
              WebkitBackdropFilter: "var(--glass-blur-heavy)",
              border: "0.5px solid var(--glass-border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--glass-shadow-xl)",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: "var(--radius-lg)",
              background: "var(--color-error-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle style={{ width: 28, height: 28, color: "var(--color-error)" }} />
            </div>

            <h3 style={{
              fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600,
              color: "var(--text-primary)", marginBottom: 8,
            }}>{title}</h3>

            <p style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-secondary)", lineHeight: 1.5,
            }}>
              {message}
              {itemName && (
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}> "{itemName}"</span>
              )}
            </p>

            <div style={{
              display: "flex", gap: 12, marginTop: 24, justifyContent: "center",
            }}>
              <button
                onClick={onClose}
                style={{
                  background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}
              >Annulla</button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                style={{
                  background: "var(--color-error)", border: "none",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                  opacity: isLoading ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: 6,
                }}
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
