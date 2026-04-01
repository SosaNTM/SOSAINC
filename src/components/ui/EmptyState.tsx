import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1.5rem",
      minHeight: 300,
      textAlign: "center",
    }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>{icon}</div>}
      <h3 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 24,
        color: "#e8ff00",
        marginBottom: 8,
        letterSpacing: 1,
      }}>
        {title}
      </h3>
      <p style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 13,
        color: "rgba(255,255,255,0.5)",
        maxWidth: 400,
        marginBottom: actionLabel ? 20 : 0,
      }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: "#e8ff00",
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "8px 20px",
            cursor: "pointer",
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            fontWeight: "bold",
            textTransform: "uppercase",
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
