import type { SearchStatus } from "@/types/leadgen";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_CONFIG: Record<SearchStatus, { label: string; color: string; Icon: React.ElementType }> = {
  pending:   { label: "In attesa",  color: "var(--text-tertiary)", Icon: Clock       },
  running:   { label: "In corso",   color: "var(--color-info)",    Icon: Loader2     },
  completed: { label: "Completata", color: "var(--color-success)", Icon: CheckCircle },
  failed:    { label: "Fallita",    color: "var(--color-error)",   Icon: XCircle     },
};

interface Props { status: SearchStatus }

export function SearchProgressIndicator({ status }: Props) {
  const cfg = STATUS_CONFIG[status];
  const spin = status === "running";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 11, color: cfg.color, fontWeight: 600 }}>
      <cfg.Icon size={13} style={spin ? { animation: "spin 1s linear infinite" } : {}} />
      {cfg.label}
    </span>
  );
}
