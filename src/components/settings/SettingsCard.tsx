import type { ReactNode } from "react";

interface SettingsCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  danger?: boolean;
}

export function SettingsCard({ title, description, children, className, noPadding, danger }: SettingsCardProps) {
  return (
    <div
      className={className}
      style={{
        background: danger
          ? "var(--color-error-soft, rgba(239, 68, 68, 0.04))"
          : "var(--glass-bg-subtle)",
        border: danger
          ? "1px solid rgba(239, 68, 68, 0.15)"
          : "0.5px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        padding: noPadding ? 0 : 24,
        marginBottom: 20,
      }}
    >
      {(title || description) && (
        <div style={{ marginBottom: noPadding ? 0 : 16, padding: noPadding ? "20px 24px 0" : 0 }}>
          {title && (
            <h3 style={{
              fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600,
              color: danger ? "var(--color-error)" : "var(--text-primary)",
              margin: 0,
            }}>{title}</h3>
          )}
          {description && (
            <p style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "var(--text-tertiary)", marginTop: 4,
            }}>{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
