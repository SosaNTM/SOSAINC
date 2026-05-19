interface DiagonalAccentProps {
  className?: string;
}

export function DiagonalAccent({ className }: DiagonalAccentProps) {
  return (
    <svg
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    >
      <line
        x1="0"
        y1="100%"
        x2="100%"
        y2="0"
        stroke="var(--sosa-yellow)"
        strokeWidth="1"
        opacity="0.12"
      />
    </svg>
  );
}
