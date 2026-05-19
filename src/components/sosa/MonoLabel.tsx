import React from "react";

interface MonoLabelProps {
  tone?: "accent" | "dim";
  size?: "sm" | "md";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MonoLabel({ tone = "dim", size = "sm", children, className, style }: MonoLabelProps) {
  const color =
    tone === "accent" ? "var(--portal-accent)" : "var(--sosa-white-40)";
  const fontSize = size === "md" ? 11 : 10;

  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-mono)",
        fontSize,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color,
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
