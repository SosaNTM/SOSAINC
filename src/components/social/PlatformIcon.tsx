import React from "react";
import { PLATFORM_CONFIG, type SocialPlatform } from "@/lib/socialStore";

interface PlatformIconProps {
  platform: SocialPlatform;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function PlatformIcon({ platform, size = 18, className, style }: PlatformIconProps) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return null;
  return (
    <img
      src={cfg.logo}
      alt={cfg.label}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", flexShrink: 0, display: "inline-block", ...style }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
