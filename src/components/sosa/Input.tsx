import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingSymbol?: string;
  label?: string;
  error?: string;
}

export function Input({
  leadingSymbol = "→",
  label,
  error,
  style,
  className,
  onFocus,
  onBlur,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--sosa-yellow)";
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = error ? "var(--color-error)" : "var(--sosa-border)";
    onBlur?.(e);
  };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      10,
            fontWeight:    500,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color:         "var(--sosa-white-40)",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {leadingSymbol && (
          <span
            aria-hidden
            style={{
              position:   "absolute",
              left:       12,
              top:        "50%",
              transform:  "translateY(-50%)",
              fontFamily: "var(--font-mono)",
              fontSize:   13,
              color:      "var(--sosa-yellow)",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            {leadingSymbol}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            width:        "100%",
            background:   "var(--sosa-bg-2)",
            border:       `1px solid ${error ? "var(--color-error)" : "var(--sosa-border)"}`,
            borderRadius: 0,
            color:        "var(--sosa-white)",
            fontFamily:   "var(--font-mono)",
            fontSize:     13,
            padding:      leadingSymbol ? "10px 12px 10px 32px" : "10px 12px",
            outline:      "none",
            transition:   `border-color var(--duration-fast) var(--ease-sharp)`,
            boxSizing:    "border-box",
            ...style,
          }}
        />
      </div>
      {error && (
        <span
          style={{
            fontFamily:    "var(--font-mono)",
            fontSize:      10,
            color:         "var(--color-error)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
