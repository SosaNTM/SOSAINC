import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterDroplet {
  top: string;
  left: string;
  width: number;
  height: number;
  opacity: number;
  rotate: number;
}

const DROPLETS: WaterDroplet[] = [
  { top: "12%", left: "8%", width: 10, height: 13, opacity: 0.35, rotate: -45 },
  { top: "6%", left: "78%", width: 8, height: 10, opacity: 0.25, rotate: -40 },
  { top: "72%", left: "92%", width: 12, height: 16, opacity: 0.4, rotate: -50 },
  { top: "85%", left: "15%", width: 9, height: 12, opacity: 0.3, rotate: -42 },
  { top: "40%", left: "95%", width: 14, height: 18, opacity: 0.2, rotate: -48 },
];

interface GlassCardProps {
  title?: string;
  className?: string;
  children: React.ReactNode;
  showDroplets?: boolean;
  headerRight?: React.ReactNode;
}

export const GlassCard = React.memo(function GlassCard({
  title,
  className,
  children,
  showDroplets = true,
  headerRight,
}: GlassCardProps) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.30)",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
        padding: 20,
      }}
    >
      {/* Water droplet decorations */}
      {showDroplets &&
        DROPLETS.map((d, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: d.top,
              left: d.left,
              width: d.width,
              height: d.height,
              background: "rgba(255, 255, 255, 0.45)",
              borderRadius: "50% 50% 50% 0 / 60% 60% 40% 0",
              transform: `rotate(${d.rotate}deg)`,
              opacity: d.opacity,
              pointerEvents: "none",
            }}
          />
        ))}

      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "inherit",
            }}
          >
            {title}
          </span>
          {headerRight ?? (
            <button type="button"
              type="button"
              className="flex items-center justify-center rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="More options"
            >
              <MoreHorizontal size={18} />
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
});
