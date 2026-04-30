import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: 400, md: 520, lg: 640 };

export function SettingsModal({
  open, onClose, title, description, children,
  onSubmit, submitLabel = "Salva", isLoading, size = "md",
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 16,
          }}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "relative", zIndex: 1,
              background: "var(--glass-bg-elevated)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
              width: "90%",
              maxWidth: SIZE_MAP[size],
              maxHeight: "88vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "20px 24px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              borderBottom: "1px solid var(--glass-border)",
            }}>
              <div>
                <h2 style={{
                  fontFamily: "var(--font-body)", fontSize: 18, fontWeight: 600,
                  color: "var(--text-primary)", margin: 0,
                }}>{title}</h2>
                {description && (
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: 12,
                    color: "var(--text-tertiary)", marginTop: 4,
                  }}>{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  cursor: "pointer", padding: 0,
                  color: "var(--text-tertiary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>

            {/* Body */}
            <div
              className="settings-modal-body"
              style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}
            >
              {children}
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--glass-border)",
              display: "flex", justifyContent: "flex-end", gap: 10,
            }}>
              <button
                onClick={onClose}
                style={{
                  height: 38, padding: "0 18px",
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
              >
                Annulla
              </button>
              <button
                onClick={onSubmit}
                disabled={isLoading}
                className="btn-primary"
                style={{
                  height: 38, padding: "0 20px",
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 13, borderRadius: 10,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                {submitLabel}
              </button>
            </div>
          </motion.div>

          <style>{`
            .settings-modal-body .glass-input {
              border-radius: 10px !important;
            }
            .settings-modal-body select.glass-input {
              border-radius: 10px !important;
            }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
