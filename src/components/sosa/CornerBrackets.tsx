interface CornerBracketsProps {
  size?: number;
  className?: string;
}

const INSET = 12;

export function CornerBrackets({ size = 40, className }: CornerBracketsProps) {
  const base: React.CSSProperties = {
    position: "fixed",
    width: size,
    height: size,
    opacity: 0.6,
    zIndex: 9998,
    pointerEvents: "none",
  };

  const border = "1px solid var(--sosa-yellow)";

  return (
    <div aria-hidden className={className}>
      {/* Top-left */}
      <div style={{ ...base, top: INSET, left: INSET, borderTop: border, borderLeft: border }} />
      {/* Top-right */}
      <div style={{ ...base, top: INSET, right: INSET, borderTop: border, borderRight: border }} />
      {/* Bottom-right */}
      <div style={{ ...base, bottom: INSET, right: INSET, borderBottom: border, borderRight: border }} />
      {/* Bottom-left */}
      <div style={{ ...base, bottom: INSET, left: INSET, borderBottom: border, borderLeft: border }} />
    </div>
  );
}
