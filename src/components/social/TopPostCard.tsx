import { useState } from "react";
import { Heart, MessageCircle, Eye } from "lucide-react";
import { type SocialPost, PLATFORM_CONFIG, formatSocialNumber } from "@/lib/socialStore";
import { PlatformIcon } from "@/components/social/PlatformIcon";

interface Props {
  post: SocialPost;
  rank: number;
  onClick: () => void;
}

const RANK_STYLES: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "#1" },
  2: { bg: "rgba(156,163,175,0.12)", color: "rgba(255,255,255,0.5)", label: "#2" },
  3: { bg: "rgba(180,120,60,0.12)", color: "rgba(200,150,80,0.8)", label: "#3" },
};

export function TopPostCard({ post, rank, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const p      = PLATFORM_CONFIG[post.platform];
  const isTop  = post.engagementRate >= 7;
  const badge  = RANK_STYLES[rank];
  const isText = post.mediaType === "text";

  return (
    <button type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: "left", width: "100%", display: "block",
        background: hovered ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 12, padding: 14, cursor: "pointer",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.3)" : "none",
        transition: "all 0.15s ease",
      }}
    >
      {/* Top row: platform icon + rank badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <PlatformIcon platform={post.platform} size={16} />
          <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.label.split(" ")[0]}</span>
        </div>
        {badge && (
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 6px", borderRadius: 20, background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Thumbnail / text preview — square */}
      <div style={{
        width: "100%", aspectRatio: "1", borderRadius: 8, marginBottom: 10, overflow: "hidden",
        background: isText ? `${p.color}08` : `linear-gradient(135deg, ${p.color}18, ${p.color}06)`,
        border: `1px solid ${p.color}15`,
        display: "flex", alignItems: isText ? "flex-start" : "center", justifyContent: "center",
        padding: isText ? 10 : 0,
      }}>
        {isText ? (
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 5, WebkitBoxOrient: "vertical" }}>
            {post.contentText}
          </p>
        ) : (
          <PlatformIcon platform={post.platform} size={36} style={{ opacity: 0.15 }} />
        )}
      </div>

      {/* Caption */}
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 10 }}>
        {post.contentText}
      </p>

      {/* Metrics */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        {[
          { Icon: Heart,         val: post.likes },
          { Icon: MessageCircle, val: post.comments },
          { Icon: Eye,           val: post.impressions },
        ].map(({ Icon, val }, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
            <Icon style={{ width: 10, height: 10 }} /> {formatSocialNumber(val)}
          </span>
        ))}
      </div>

      {/* Engagement rate */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: isTop ? "#f59e0b" : "rgba(255,255,255,0.65)" }}>
          {post.engagementRate}%
        </span>
        {isTop && <span style={{ fontSize: 12 }}>🏆</span>}
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>engagement</span>
      </div>
    </button>
  );
}
