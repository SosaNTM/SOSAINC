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
          }}
        >
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.7)",
            }}
          />

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "relative", zIndex: 1,
              background: "var(--sosa-bg-3)",
              border: "1px solid var(--sosa-border)",
              borderRadius: 0,
              width: "90%",
              maxWidth: SIZE_MAP[size],
              maxHeight: "85vh",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              borderBottom: "1px solid var(--divider)",
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
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "var(--text-tertiary)", borderRadius: "var(--radius-sm)",
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {children}
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--divider)",
              display: "flex", justifyContent: "flex-end", gap: 12,
            }}>
              <button
                onClick={onClose}
                style={{
                  background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", padding: "8px 16px",
                  fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}
              >
                Annulla
              </button>
              <button
                onClick={onSubmit}
                disabled={isLoading}
                className="btn-primary"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: 13, padding: "8px 20px",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                {submitLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
