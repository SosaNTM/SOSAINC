import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
  };
}

export function SettingsPageHeader({ icon: Icon, title, description, action }: SettingsPageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 24,
        gap: 16,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "var(--radius-md)",
          background: "var(--accent-primary-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon style={{ width: 20, height: 20, color: "var(--accent-primary)" }} />
        </div>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "var(--text-h1)",
            fontWeight: 600, color: "var(--text-primary)",
            letterSpacing: "0.02em", lineHeight: 1.2, margin: 0,
          }}>{title}</h1>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 13,
            color: "var(--text-tertiary)", marginTop: 4,
          }}>{description}</p>
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, padding: "8px 16px", whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <action.icon style={{ width: 15, height: 15 }} />
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
