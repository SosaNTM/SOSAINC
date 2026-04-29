import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  arrow?: "↗" | "→" | false;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { fontSize: 10, padding: "6px 12px" },
  md: { fontSize: 11, padding: "10px 16px" },
  lg: { fontSize: 12, padding: "12px 20px" },
};

export function Button({
  variant = "primary",
  arrow,
  size = "md",
  children,
  style,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isOutline = variant === "outline";
  const isGhost   = variant === "ghost";

  const defaultArrow = arrow !== false ? (arrow ?? (isOutline ? "→" : "↗")) : undefined;

  const base: React.CSSProperties = {
    display:        "inline-flex",
    alignItems:     "center",
    gap:            6,
    fontFamily:     "var(--font-mono)",
    fontWeight:     700,
    textTransform:  "uppercase",
    letterSpacing:  "0.12em",
    lineHeight:     1,
    borderRadius:   0,
    cursor:         disabled ? "not-allowed" : "pointer",
    transition:     `opacity var(--duration-fast) var(--ease-sharp), background var(--duration-fast) var(--ease-sharp)`,
    opacity:        disabled ? 0.4 : 1,
    border:         "none",
    outline:        "none",
    userSelect:     "none",
    whiteSpace:     "nowrap",
    ...SIZE_STYLES[size],
  };

  const variantStyles: React.CSSProperties = isOutline
    ? {
        background:  "transparent",
        color:       "var(--portal-accent)",
        border:      "1px solid var(--portal-accent)",
      }
    : isGhost
    ? {
        background:  "transparent",
        color:       "var(--sosa-white-40)",
        border:      "1px solid var(--sosa-border)",
      }
    : {
        background:  "var(--sosa-yellow)",
        color:       "#000000",
        border:      "none",
      };

  return (
    <button
      {...props}
      disabled={disabled}
      className={className}
      style={{ ...base, ...variantStyles, ...style }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        props.onMouseLeave?.(e);
      }}
    >
      {children}
      {defaultArrow && <span aria-hidden style={{ fontSize: "1.1em" }}>{defaultArrow}</span>}
    </button>
  );
}
