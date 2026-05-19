interface StatusDotProps {
  label: string;
  tone?: "portal" | "system" | "error" | "warning";
  className?: string;
}

const TONE_COLOR: Record<string, string> = {
  portal:  "var(--portal-accent)",
  system:  "var(--color-success)",
  error:   "var(--color-error)",
  warning: "var(--color-warning)",
};

export function StatusDot({ label, tone = "system", className }: StatusDotProps) {
  const color = TONE_COLOR[tone] ?? "var(--color-success)";

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 6 }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          color: "var(--sosa-white-40)",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}
