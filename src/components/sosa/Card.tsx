import React from "react";
import { MonoLabel } from "./MonoLabel";

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  footerTags?: string[];
  footerValue?: string;
  accent?: "portal" | "sosa";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  title,
  action,
  footerTags,
  footerValue,
  accent = "portal",
  children,
  className,
  style,
}: CardProps) {
  const accentColor = accent === "sosa" ? "var(--sosa-yellow)" : "var(--portal-accent)";

  return (
    <div
      className={className}
      style={{
        background:   "var(--sosa-bg-2)",
        border:       "1px solid var(--sosa-border)",
        borderRadius: 0,
        borderLeft:   `3px solid ${accentColor}`,
        display:      "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display:       "flex",
            alignItems:    "center",
            justifyContent: "space-between",
            padding:       "12px 16px",
            borderBottom:  "1px solid var(--sosa-border)",
          }}
        >
          {title && (
            <MonoLabel tone="accent" size="md">
              {title}
            </MonoLabel>
          )}
          {action && <div>{action}</div>}
        </div>
      )}

      {children && (
        <div style={{ padding: "16px", flex: 1 }}>
          {children}
        </div>
      )}

      {(footerTags || footerValue) && (
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "8px 16px",
            borderTop:      "1px solid var(--sosa-border)",
          }}
        >
          {footerTags && (
            <div style={{ display: "flex", gap: 8 }}>
              {footerTags.map((tag, i) => (
                <span key={tag}>
                  {i > 0 && <span style={{ marginRight: 8, opacity: 0.4, color: "var(--sosa-white-20)", fontFamily: "var(--font-mono)", fontSize: 10 }}>×</span>}
                  <MonoLabel tone="dim">#{tag}</MonoLabel>
                </span>
              ))}
            </div>
          )}
          {footerValue && (
            <span
              style={{
                fontFamily:    "var(--font-mono)",
                fontSize:      11,
                color:         "var(--sosa-white-70)",
                letterSpacing: "0.08em",
              }}
            >
              {footerValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
