const WORKSPACE_LABELS: Record<string, string> = {
  sosa:    "SOSA INC.",
  keylo:   "KEYLO",
  redx:    "REDX",
  trustme: "TRUST ME",
};

interface LogoLockupProps {
  workspace: string;
  className?: string;
}

export function LogoLockup({ workspace, className }: LogoLockupProps) {
  const label = WORKSPACE_LABELS[workspace] ?? workspace.toUpperCase();

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 10 }}
    >
      {/* 6×6 yellow square */}
      <div
        style={{
          width: 8,
          height: 8,
          background: "var(--sosa-yellow)",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--sosa-white)",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}
