import type { ReactNode } from "react";

interface SettingsFormFieldProps {
  label: string;
  description?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function SettingsFormField({ label, description, required, error, children }: SettingsFormFieldProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block",
        fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
        color: "var(--text-primary)",
      }}>
        {label}
        {required && <span style={{ color: "var(--color-error)", marginLeft: 2 }}>*</span>}
      </label>
      {description && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 11,
          color: "var(--text-tertiary)", marginTop: 2,
        }}>{description}</p>
      )}
      <div style={{ marginTop: 6 }}>{children}</div>
      {error && (
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 11,
          color: "var(--color-error)", marginTop: 4,
        }}>{error}</p>
      )}
    </div>
  );
}
