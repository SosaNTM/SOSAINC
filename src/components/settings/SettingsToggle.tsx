interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function SettingsToggle({ checked, onChange, label, disabled }: SettingsToggleProps) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }}>
      {label && (
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 13,
          color: "var(--text-secondary)",
        }}>{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 9999,
          background: checked ? "var(--accent-color, var(--accent-primary))" : "var(--glass-bg-subtle)",
          border: `1px solid ${checked ? "var(--accent-color, var(--accent-primary))" : "var(--glass-border)"}`,
          padding: 2, cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          display: "flex", alignItems: "center",
          position: "relative",
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          transition: "transform 0.2s ease",
        }} />
      </button>
    </label>
  );
}
