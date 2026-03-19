import * as React from "react";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "in-progress"
  | "blocked"
  | "completed"
  | "generating"
  | "failed"
  | "pending"
  | "paid"
  | "overdue"
  | "draft";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const VARIANT_STYLES: Record<StatusVariant, { background: string; color: string }> = {
  "in-progress": { background: "rgba(74, 158, 255, 0.15)", color: "#4A9EFF" },
  pending:       { background: "rgba(74, 158, 255, 0.15)", color: "#4A9EFF" },
  blocked:       { background: "rgba(255, 90, 90, 0.15)",  color: "#FF5A5A" },
  failed:        { background: "rgba(255, 90, 90, 0.15)",  color: "#FF5A5A" },
  overdue:       { background: "rgba(255, 90, 90, 0.15)",  color: "#FF5A5A" },
  completed:     { background: "rgba(46, 204, 113, 0.15)", color: "#2ECC71" },
  paid:          { background: "rgba(46, 204, 113, 0.15)", color: "#2ECC71" },
  generating:    { background: "rgba(255, 159, 67, 0.15)", color: "#FF9F43" },
  draft:         { background: "rgba(150, 150, 150, 0.15)", color: "#999999" },
};

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const styles = variant ? VARIANT_STYLES[variant] : VARIANT_STYLES.draft;

  return (
    <span
      className={cn("inline-flex items-center whitespace-nowrap", className)}
      style={{
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        background: styles.background,
        color: styles.color,
      }}
    >
      {status}
    </span>
  );
}
