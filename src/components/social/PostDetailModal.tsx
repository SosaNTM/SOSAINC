import { useState, useEffect } from "react";
import {
  X, ExternalLink, Heart, MessageCircle, Repeat2, Bookmark,
  Eye, MousePointerClick, Trophy, Play, Users, TrendingUp,
} from "lucide-react";
import { type SocialPost, PLATFORM_CONFIG, formatSocialNumber, mockSocialPosts } from "@/lib/socialStore";
import { PlatformIcon } from "@/components/social/PlatformIcon";
import {
  Area, Line, AreaChart, ComposedChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";

// ── Account averages (hardcoded for demo) ─────────────────────────────────────

const ACCT_AVG = { likes: 843, comments: 72, shares: 134, saves: 156, clicks: 84 };

const CONTENT_TYPE_AVG_ENG: Record<string, number> = {
  carousel: 5.8,
  image:    4.3,
  video:    5.1,
  reel:     7.2,
  text:     2.4,
  story:    3.5,
};

// ── Interaction bar row ────────────────────────────────────────────────────────

function InteractionRow({
  icon, label, value, total, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = total > 0 ? (value / total) * 100 : 0;
  const sharePct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "5px 0",
        cursor: "default",
        position: "relative",
      }}
      title={`${formatSocialNumber(value)} — ${sharePct}% of total engagement`}
    >
      <span style={{ width: 16, flexShrink: 0, fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.45)", width: 68, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)", width: 48, textAlign: "right", flexShrink: 0 }}>
        {formatSocialNumber(value)}
      </span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            width: `${pct}%`,
            background: hovered ? color : `${color}88`,
            transition: "background 0.2s ease",
            filter: hovered ? `drop-shadow(0 0 4px ${color}60)` : "none",
          }}
        />
      </div>
    </div>
  );
}

// ── Mini stat card ─────────────────────────────────────────────────────────────

function MiniStatCard({
  label, value, badge, accent,
}: {
  label: string;
  value: string;
  badge?: string;
  accent?: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)"}`,
        borderRadius: 12,
        padding: "11px 14px",
        textAlign: "center",
        transition: "background 0.15s, border-color 0.15s",
        cursor: "default",
      }}
    >
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ fontSize: 17, fontWeight: 800, color: accent ?? "rgba(255,255,255,0.92)", lineHeight: 1 }}>
        {value}{badge ? ` ${badge}` : ""}
      </p>
    </div>
  );
}

// ── Comparison bar ─────────────────────────────────────────────────────────────

function ComparisonBar({
  label, postValue, avgValue, color, index,
}: {
  label: string;
  postValue: number;
  avgValue: number;
  color: string;
  index: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 60 + 150);
    return () => clearTimeout(t);
  }, [index]);

  const diff = postValue - avgValue;
  const pct = avgValue > 0 ? Math.round((diff / avgValue) * 100) : 0;
  const isPos = diff >= 0;
  const maxVal = Math.max(postValue, avgValue) * 1.2;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: isPos ? "#10b981" : "#ef4444" }}>
          {isPos ? "+" : ""}{pct}%
        </span>
      </div>
      <div style={{ position: "relative", height: 20 }}>
        {/* Avg bar (background) */}
        <div style={{
          position: "absolute",
          top: 4,
          left: 0,
          height: 12,
          width: mounted ? `${(avgValue / maxVal) * 100}%` : "0%",
          background: "rgba(255,255,255,0.1)",
          borderRadius: 3,
          transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
        {/* Post bar (foreground) */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 20,
          width: mounted ? `${(postValue / maxVal) * 100}%` : "0%",
          background: `${color}70`,
          borderRadius: 3,
          transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          alignItems: "center",
          paddingLeft: 6,
          overflow: "hidden",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>
            {formatSocialNumber(postValue)}
          </span>
        </div>
        {/* Avg label */}
        <span style={{
          position: "absolute",
          right: 0,
          top: 4,
          fontSize: 9,
          color: "rgba(255,255,255,0.25)",
          fontWeight: 500,
          lineHeight: "12px",
        }}>
          avg {formatSocialNumber(avgValue)}
        </span>
      </div>
    </div>
  );
}

// ── Tooltip style ──────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: "rgba(8,12,24,0.97)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: "9px 13px",
    boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
    fontSize: 12,
    color: "#fff",
  },
  labelStyle: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 3 },
};

// ── Main component ─────────────────────────────────────────────────────────────

interface PostDetailModalProps {
  post: SocialPost;
  onClose: () => void;
}

export function PostDetailModal({ post, onClose }: PostDetailModalProps) {
  const platform = PLATFORM_CONFIG[post.platform];
  const isPublished = post.status === "published";
  const isTopPerformer = post.engagementRate >= 6;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Engagement timeline: 9 time points
  const ENG_LABELS = ["1h", "3h", "6h", "12h", "24h", "48h", "7d", "14d", "30d"];
  const POST_FRACS  = [0.08, 0.22, 0.45, 0.60, 0.72, 0.83, 0.91, 0.96, 1.00];
  const AVG_FRACS   = [0.06, 0.17, 0.35, 0.50, 0.63, 0.75, 0.85, 0.92, 1.00];
  const totalEng    = post.likes + post.comments + post.shares + post.saves;
  const avgTotalEng = ACCT_AVG.likes + ACCT_AVG.comments + ACCT_AVG.shares + ACCT_AVG.saves;

  const engTimeline = ENG_LABELS.map((label, i) => ({
    label,
    engagement: Math.round(totalEng * POST_FRACS[i]),
    average:    Math.round(avgTotalEng * AVG_FRACS[i]),
  }));

  // Interaction total for bar widths
  const interactionTotal = post.likes + post.comments + post.shares + post.saves + post.clicks;

  // Content type ranking among published posts
  const sameTypePosts = mockSocialPosts
    .filter(p => p.status === "published" && p.mediaType === post.mediaType && p.engagementRate > 0)
    .sort((a, b) => b.engagementRate - a.engagementRate);
  const rankIdx = sameTypePosts.findIndex(p => p.id === post.id);
  const rank = rankIdx >= 0 ? rankIdx + 1 : null;
  const typeAvgEng = CONTENT_TYPE_AVG_ENG[post.mediaType] ?? 4.5;
  const typeMaxEng = Math.max(post.engagementRate, typeAvgEng) * 1.3;

  // Date display
  const dateStr = isPublished && post.publishedAt
    ? `Published ${new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${new Date(post.publishedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
    : post.scheduledAt
    ? `Scheduled ${new Date(post.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "Draft";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.72)",
          backdropFilter: "blur(6px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 501,
          width: "min(900px, 95vw)",
          maxHeight: "90vh",
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <PlatformIcon platform={post.platform} size={18} />
            <span style={{ fontSize: 14, fontWeight: 700, color: platform.color }}>{platform.label}</span>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>·</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{dateStr}</span>
            {isTopPerformer && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(245,158,11,0.12)", color: "#f59e0b",
                padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                border: "1px solid rgba(245,158,11,0.22)",
              }}>
                <Trophy style={{ width: 11, height: 11 }} /> Top Performer
              </span>
            )}
            {post.status !== "published" && (
              <span style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 20, fontWeight: 700,
                background: post.status === "scheduled" ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.06)",
                color: post.status === "scheduled" ? "#f59e0b" : "rgba(255,255,255,0.35)",
                border: `1px dashed ${post.status === "scheduled" ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)"}`,
                textTransform: "uppercase" as const, letterSpacing: "0.5px",
              }}>
                {post.status}
              </span>
            )}
          </div>
          <button type="button"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>

            {/* Left — Content */}
            <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Media placeholder */}
              <div style={{
                width: "100%",
                height: 200,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${platform.color}20, ${platform.color}08)`,
                border: `1px solid ${platform.color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                flexShrink: 0,
              }}>
                {post.mediaType === "video" || post.mediaType === "reel" ? (
                  <Play style={{ width: 44, height: 44, color: platform.color, opacity: 0.4 }} />
                ) : (
                  <PlatformIcon platform={post.platform} size={44} style={{ opacity: 0.18 }} />
                )}
              </div>

              {/* Caption */}
              <p style={{
                fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.65,
                marginBottom: 12,
                display: "-webkit-box",
                WebkitLineClamp: 6,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}>
                {post.contentText}
              </p>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {post.tags.map(t => (
                    <span key={t} style={{
                      fontSize: 10, padding: "3px 9px", borderRadius: 20,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.4)",
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta: type + campaign */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{
                  fontSize: 10, padding: "3px 9px", borderRadius: 20,
                  background: `${platform.color}14`,
                  border: `1px solid ${platform.color}20`,
                  color: platform.color,
                }}>
                  {post.mediaType.charAt(0).toUpperCase() + post.mediaType.slice(1)}
                </span>
                {post.campaign && (
                  <span style={{
                    fontSize: 10, padding: "3px 9px", borderRadius: 20,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.4)",
                  }}>
                    {post.campaign}
                  </span>
                )}
                {post.videoViews != null && post.videoViews > 0 && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", alignSelf: "center" }}>
                    {formatSocialNumber(post.videoViews)} views
                  </span>
                )}
              </div>

              {/* External link */}
              {post.postUrl && isPublished && (
                <a
                  href={post.postUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600,
                    color: platform.color,
                    textDecoration: "none",
                    background: `${platform.color}12`,
                    border: `1px solid ${platform.color}22`,
                    padding: "6px 12px",
                    borderRadius: 8,
                    transition: "opacity 0.15s",
                    marginTop: 4,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.75"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
                >
                  View on {platform.label} <ExternalLink style={{ width: 11, height: 11 }} />
                </a>
              )}
            </div>

            {/* Right — Performance */}
            <div style={{ padding: "20px 24px" }}>
              {isPublished ? (
                <>
                  {/* 4 mini stat cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                    <MiniStatCard label="Impressions" value={formatSocialNumber(post.impressions)} />
                    <MiniStatCard label="Reach" value={formatSocialNumber(post.reach)} />
                    <MiniStatCard
                      label="Eng. Rate"
                      value={`${post.engagementRate}%`}
                      badge={isTopPerformer ? "🏆" : undefined}
                      accent={isTopPerformer ? "#f59e0b" : undefined}
                    />
                    <MiniStatCard label="Clicks" value={formatSocialNumber(post.clicks)} />
                  </div>

                  {/* Interaction breakdown */}
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
                    Interaction Breakdown
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <InteractionRow icon={<Heart size={12} color="#f43f5e" />} label="Likes" value={post.likes} total={interactionTotal} color="#f43f5e" />
                    <InteractionRow icon={<MessageCircle size={12} color="#3b82f6" />} label="Comments" value={post.comments} total={interactionTotal} color="#3b82f6" />
                    <InteractionRow icon={<Repeat2 size={12} color="#10b981" />} label="Shares" value={post.shares} total={interactionTotal} color="#10b981" />
                    <InteractionRow icon={<Bookmark size={12} color="#f59e0b" />} label="Saves" value={post.saves} total={interactionTotal} color="#f59e0b" />
                    <InteractionRow icon={<MousePointerClick size={12} color="#a78bfa" />} label="Clicks" value={post.clicks} total={interactionTotal} color="#a78bfa" />
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "rgba(255,255,255,0.25)" }}>
                  <Eye size={32} style={{ opacity: 0.3 }} />
                  <p style={{ fontSize: 13, fontWeight: 600 }}>
                    {post.status === "scheduled" ? "Performance data after publishing" : "Draft — not yet published"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Engagement over time ── */}
          {isPublished && (
            <div style={{ padding: "0 24px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 18, marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.25)" }}>
                  Engagement Over Time
                </p>
                <div style={{ display: "flex", gap: 14 }}>
                  {[
                    { label: "This post", color: platform.color, dash: false },
                    { label: "Avg post",  color: "rgba(255,255,255,0.3)", dash: true },
                  ].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 16, height: 2, borderRadius: 1, background: l.color, borderBottom: l.dash ? `1px dashed ${l.color}` : "none", opacity: l.dash ? 1 : 1 }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={engTimeline} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`post-eng-grad-${post.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={platform.color} stopOpacity={0.22} />
                        <stop offset="100%" stopColor={platform.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
                      axisLine={false}
                      tickLine={false}
                      width={42}
                      tickFormatter={formatSocialNumber}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle.contentStyle}
                      labelStyle={tooltipStyle.labelStyle}
                      cursor={{ stroke: "rgba(255,255,255,0.1)", strokeDasharray: "4 4" }}
                      formatter={(v: any, name: string) => [
                        formatSocialNumber(v as number),
                        name === "engagement" ? "This post" : "Avg post",
                      ]}
                      labelFormatter={(l) => `After ${l}`}
                    />
                    {/* Avg line (dashed, behind) */}
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={false}
                      animationDuration={800}
                    />
                    {/* This post area (front) */}
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stroke={platform.color}
                      strokeWidth={2.5}
                      fill={`url(#post-eng-grad-${post.id})`}
                      dot={false}
                      activeDot={{
                        r: 5, fill: platform.color, stroke: "#0d1117", strokeWidth: 2,
                        style: { filter: `drop-shadow(0 0 5px ${platform.color})` },
                      }}
                      animationDuration={800}
                      animationEasing="ease-out"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Comparison section ── */}
          {isPublished && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}>
              {/* vs Account Average */}
              <div style={{ padding: "18px 24px", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>
                  vs Account Average
                </p>
                <ComparisonBar label="Likes"    postValue={post.likes}    avgValue={ACCT_AVG.likes}    color={platform.color} index={0} />
                <ComparisonBar label="Comments" postValue={post.comments} avgValue={ACCT_AVG.comments} color={platform.color} index={1} />
                <ComparisonBar label="Shares"   postValue={post.shares}   avgValue={ACCT_AVG.shares}   color={platform.color} index={2} />
                <ComparisonBar label="Saves"    postValue={post.saves}    avgValue={ACCT_AVG.saves}    color={platform.color} index={3} />
              </div>

              {/* vs Same Content Type */}
              <div style={{ padding: "18px 24px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.25)", marginBottom: 14 }}>
                  vs Same Content Type ({post.mediaType})
                </p>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Eng. Rate</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: post.engagementRate >= typeAvgEng ? "#10b981" : "#ef4444" }}>
                      {post.engagementRate >= typeAvgEng ? "+" : ""}{(post.engagementRate - typeAvgEng).toFixed(1)} pts
                    </span>
                  </div>
                  {/* Post rate bar */}
                  <div style={{ position: "relative", marginBottom: 6 }}>
                    <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        borderRadius: 4,
                        width: `${Math.min((post.engagementRate / typeMaxEng) * 100, 100)}%`,
                        background: platform.color,
                        transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                        boxShadow: `0 0 8px ${platform.color}40`,
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{post.engagementRate}%</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{post.mediaType} avg: {typeAvgEng}%</span>
                    </div>
                  </div>
                  {/* Avg rate bar */}
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden", marginBottom: 16 }}>
                    <div style={{
                      height: "100%",
                      borderRadius: 3,
                      width: `${Math.min((typeAvgEng / typeMaxEng) * 100, 100)}%`,
                      background: "rgba(255,255,255,0.18)",
                      transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
                    }} />
                  </div>
                </div>

                {/* Ranking badge */}
                {rank !== null && sameTypePosts.length > 1 && (
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    background: rank === 1 ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                    border: rank === 1 ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                  }}>
                    <span style={{ fontSize: 18, lineHeight: 1.2 }}>{rank === 1 ? "🏆" : rank <= 3 ? "🥈" : "📊"}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: rank === 1 ? "#f59e0b" : "rgba(255,255,255,0.75)" }}>
                        #{rank} {post.mediaType} post
                      </p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        out of {sameTypePosts.length} {post.mediaType} posts
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
