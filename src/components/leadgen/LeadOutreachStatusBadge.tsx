import type { OutreachStatus } from "@/types/leadgen";

const STATUS_CONFIG: Record<OutreachStatus, { label: string; color: string }> = {
  new:       { label: "Nuovo",       color: "var(--text-tertiary)" },
  contacted: { label: "Contattato",  color: "var(--color-info)" },
  replied:   { label: "Risposto",    color: "var(--accent-primary)" },
  qualified: { label: "Qualificato", color: "var(--color-warning)" },
  converted: { label: "Convertito",  color: "var(--color-success)" },
  rejected:  { label: "Rifiutato",   color: "var(--color-error)" },
};

interface Props {
  status: OutreachStatus;
  onClick?: (e: React.MouseEvent) => void;
}

export function LeadOutreachStatusBadge({ status, onClick }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
  return (
    <span
      onClick={onClick ? (e) => onClick(e) : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: cfg.color, cursor: onClick ? "pointer" : "default",
        padding: "2px 6px",
        border: `1px solid ${cfg.color}`,
        borderRadius: 0,
        background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
