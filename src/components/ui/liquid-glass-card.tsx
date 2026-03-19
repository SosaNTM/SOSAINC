import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * SVG filter for liquid glass distortion effect.
 * Render once per page that uses LiquidGlassCard.
 */
export function LiquidGlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter id="kpi-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.04" numOctaves="1" seed="2" result="turbulence" />
          <feGaussianBlur in="turbulence" stdDeviation="3" result="blurredNoise" />
          <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="40" xChannelSelector="R" yChannelSelector="B" result="displaced" />
          <feGaussianBlur in="displaced" stdDeviation="2.5" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

const INSET_SHADOW = [
  "0 8px 32px rgba(0,0,0,0.12)",
  "0 2px 8px rgba(0,0,0,0.08)",
  "inset 0 1px 0 rgba(255,255,255,0.06)",
  "inset 0 -1px 0 rgba(0,0,0,0.15)",
  "inset 1px 0 0 rgba(255,255,255,0.02)",
  "inset -1px 0 0 rgba(255,255,255,0.02)",
].join(", ");

interface LiquidGlassCardProps extends HTMLMotionProps<"div"> {
  /** Accent color for the ambient glow (CSS color value). Falls back to accent-color var. */
  accentColor?: string;
  /** Whether the card lifts on hover */
  hover?: boolean;
  /** Whether the card is interactive (cursor pointer) */
  interactive?: boolean;
  /** Custom padding for the content area */
  padding?: string | number;
  /** Extra className applied to the inner content wrapper (e.g. "flex items-center gap-4") */
  contentClassName?: string;
  children: React.ReactNode;
}

export function LiquidGlassCard({
  accentColor = "var(--accent-color)",
  hover = true,
  interactive = false,
  padding = 24,
  contentClassName,
  className,
  children,
  ...motionProps
}: LiquidGlassCardProps) {
  return (
    <motion.div
      className={cn("group relative w-full", interactive && "cursor-pointer", className)}
      whileHover={hover ? { y: -3, scale: 1.005, transition: { duration: 0.25, ease: "easeOut" } } : undefined}
      style={{ transformOrigin: "center center" }}
      {...motionProps}
    >
      {/* Outer gradient border wrapper */}
      <div
        className="relative rounded-2xl p-[0.5px] overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 40%, transparent 60%, rgba(255,255,255,0.04))",
        }}
      >
        {/* Inner card body */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            boxShadow: INSET_SHADOW,
          }}
        >
          {/* Liquid glass distortion layer */}
          <div
            className="absolute inset-0 -z-10 overflow-hidden rounded-2xl"
            style={{ backdropFilter: 'url("#kpi-glass")' }}
          />

          {/* Top light refraction */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none z-20"
            style={{
              background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.1) 70%, transparent 95%)",
            }}
          />

          {/* Ambient color glow */}
          <div
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] pointer-events-none z-0 opacity-40 group-hover:opacity-70 transition-opacity duration-500"
            style={{
              background: `radial-gradient(ellipse at 25% 15%, color-mix(in srgb, ${accentColor} 6%, transparent) 0%, transparent 55%)`,
            }}
          />

          {/* Hover shine sweep */}
          <div
            className="absolute inset-0 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.04) 55%, transparent 65%)",
            }}
          />

          {/* Content */}
          <div className={cn("relative z-10", contentClassName)} style={{ padding }}>
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
