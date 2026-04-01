import { useState, useMemo } from "react";
import { mockSocialPosts, PLATFORM_CONFIG, formatSocialNumber, type SocialPost } from "@/lib/socialStore";
import { PostDetailModal } from "@/components/social/PostDetailModal";
import { PlatformIcon } from "@/components/social/PlatformIcon";
import { Heart, MessageCircle, Repeat2, Bookmark, Eye, Trophy, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from "lucide-react";
import { ModuleErrorBoundary } from "@/components/ui/ModuleErrorBoundary";

type ViewMode = "feed" | "calendar";

const TODAY_DATE = new Date();
const TODAY_DAY   = TODAY_DATE.getDate();
const TODAY_MONTH = TODAY_DATE.getMonth();
const TODAY_YEAR  = TODAY_DATE.getFullYear();

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const MEDIA_TYPE_ICONS: Record<string, string> = {
  carousel: "🎠",
  image: "🖼",
  video: "🎬",
  reel: "🎞",
  story: "⭕",
  text: "📝",
};

type DayPopoverState = { day: number; posts: SocialPost[] } | null;

export default function SocialContent() {
  const [view, setView]                   = useState<ViewMode>("feed");
  const [selectedPost, setSelectedPost]   = useState<SocialPost | null>(null);
  const [dayPopover, setDayPopover]       = useState<DayPopoverState>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter]   = useState<string>("all");
  const [sortBy, setSortBy]               = useState<string>("recent");
  const [calMonth, setCalMonth]           = useState(new Date(TODAY_YEAR, TODAY_MONTH));

  const filtered = useMemo(() => {
    let posts = [...mockSocialPosts];
    if (platformFilter !== "all") posts = posts.filter((p) => p.platform === platformFilter);
    if (statusFilter !== "all")   posts = posts.filter((p) => p.status === statusFilter);
    if (sortBy === "recent")      posts.sort((a, b) => new Date(b.publishedAt || b.scheduledAt || "").getTime() - new Date(a.publishedAt || a.scheduledAt || "").getTime());
    else if (sortBy === "engagement")  posts.sort((a, b) => b.engagementRate - a.engagementRate);
    else if (sortBy === "impressions") posts.sort((a, b) => b.impressions - a.impressions);
    return posts;
  }, [platformFilter, statusFilter, sortBy]);

  const publishedWithEng = filtered.filter((p) => p.status === "published" && p.engagementRate > 0);
  const avgEng = publishedWithEng.length > 0
    ? publishedWithEng.reduce((s, p) => s + p.engagementRate, 0) / publishedWithEng.length
    : 0;

  // Calendar helpers
  const calYear     = calMonth.getFullYear();
  const calMonthNum = calMonth.getMonth();
  const firstDay    = new Date(calYear, calMonthNum, 1).getDay();
  const daysInMonth = new Date(calYear, calMonthNum + 1, 0).getDate();
  const startPad    = firstDay === 0 ? 6 : firstDay - 1; // Monday start

  const calendarPosts = useMemo(() => {
    const map: Record<number, SocialPost[]> = {};
    mockSocialPosts.forEach((p) => {
      const d = p.publishedAt || p.scheduledAt;
      if (!d) return;
      const dt = new Date(d);
      if (dt.getFullYear() === calYear && dt.getMonth() === calMonthNum) {
        const day = dt.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [calYear, calMonthNum]);

  const platforms = Array.from(new Set(mockSocialPosts.map((p) => p.platform)));

  return (
    <ModuleErrorBoundary moduleName="Social Content">
    <div style={{ paddingBottom: 40, maxWidth: 1400, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Content</h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 3 }}>
            {mockSocialPosts.filter((p) => p.status === "published").length} published · {mockSocialPosts.filter((p) => p.status === "scheduled").length} scheduled · {mockSocialPosts.filter((p) => p.status === "draft").length} drafts
          </p>
        </div>
        <button type="button"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "#10b981", border: "none", color: "#fff", cursor: "pointer" }}
        >
          <Plus style={{ width: 15, height: 15 }} /> New Post
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {/* View toggle */}
        <div style={{ display: "flex", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 8, overflow: "hidden" }}>
          {([
            { mode: "feed" as ViewMode,     icon: List,         label: "Feed" },
            { mode: "calendar" as ViewMode, icon: CalendarIcon, label: "Calendar" },
          ] as const).map((v) => (
            <button type="button"
              key={v.mode}
              onClick={() => setView(v.mode)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                color:      view === v.mode ? "var(--text-primary)"   : "var(--text-tertiary)",
                background: view === v.mode ? "rgba(255,255,255,0.07)" : "transparent",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <v.icon style={{ width: 14, height: 14 }} /> {v.label}
            </button>
          ))}
        </div>

        {/* Platform filter */}
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}
        >
          <option value="all" style={{ background: "#0d1117" }}>All Platforms</option>
          {platforms.map((pl) => (
            <option key={pl} value={pl} style={{ background: "#0d1117" }}>{PLATFORM_CONFIG[pl].label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", cursor: "pointer", outline: "none" }}
        >
          <option value="all"       style={{ background: "#0d1117" }}>All Status</option>
          <option value="published" style={{ background: "#0d1117" }}>Published</option>
          <option value="scheduled" style={{ background: "#0d1117" }}>Scheduled</option>
          <option value="draft"     style={{ background: "#0d1117" }}>Draft</option>
        </select>

        {/* Sort (feed only) */}
        {view === "feed" && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", cursor: "pointer", outline: "none", marginLeft: "auto" }}
          >
            <option value="recent"      style={{ background: "#0d1117" }}>Most Recent</option>
            <option value="engagement"  style={{ background: "#0d1117" }}>Most Engaging</option>
            <option value="impressions" style={{ background: "#0d1117" }}>Most Impressions</option>
          </select>
        )}
      </div>

      {/* ── Feed View ── */}
      {view === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-quaternary)", padding: "60px 0", fontSize: 14 }}>No posts match the current filters.</p>
          )}
          {filtered.map((post) => {
            const p        = PLATFORM_CONFIG[post.platform];
            const isTop    = post.engagementRate >= avgEng * 2 && post.engagementRate > 0;
            const engBarW  = avgEng > 0 ? Math.min((post.engagementRate / (avgEng * 2.5)) * 100, 100) : 0;
            const dateStr  = post.publishedAt
              ? `Published ${fmtDate(post.publishedAt)} at ${fmtTime(post.publishedAt)}`
              : post.scheduledAt
              ? `Scheduled ${fmtDate(post.scheduledAt)} at ${fmtTime(post.scheduledAt)}`
              : "Draft";

            return (
              <button type="button"
                key={post.id}
                onClick={() => setSelectedPost(post)}
                style={{
                  width: "100%", textAlign: "left", display: "block",
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  borderRadius: 14, padding: 18, cursor: "pointer",
                  opacity: post.status === "draft" ? 0.75 : 1,
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                  e.currentTarget.style.background  = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                  e.currentTarget.style.background  = "var(--glass-bg)";
                }}
              >
                <div style={{ display: "flex", gap: 16 }}>
                  {/* Thumbnail */}
                  <div style={{
                    width: 80, height: 80, borderRadius: 10, flexShrink: 0,
                    background: `${p.color}14`, border: `1px solid ${p.color}20`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28,
                  }}>
                    {MEDIA_TYPE_ICONS[post.mediaType] || <PlatformIcon platform={post.platform} size={28} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                      <PlatformIcon platform={post.platform} size={15} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>·</span>
                      <span style={{ fontSize: 11, color: "var(--text-quaternary)" }}>{dateStr}</span>
                      {post.status !== "published" && (
                        <span style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 20, fontWeight: 700,
                          background: post.status === "scheduled" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                          color: post.status === "scheduled" ? "#f59e0b" : "var(--text-quaternary)",
                          border: post.status === "scheduled" ? "1px dashed rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
                          textTransform: "uppercase", letterSpacing: "0.5px",
                        }}>
                          {post.status}
                        </span>
                      )}
                    </div>

                    {/* Caption */}
                    <p style={{
                      fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden", marginBottom: 7,
                    }}>
                      {post.contentText}
                    </p>

                    {/* Type + campaign pills */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: post.status === "published" ? 10 : 0 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "var(--text-quaternary)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        {MEDIA_TYPE_ICONS[post.mediaType]} {post.mediaType.charAt(0).toUpperCase() + post.mediaType.slice(1)}
                      </span>
                      {post.campaign && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${p.color}10`, color: p.color, border: `1px solid ${p.color}20` }}>
                          {post.campaign}
                        </span>
                      )}
                    </div>

                    {/* View Post link */}
                    {post.postUrl && post.status === "published" && (
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: p.color, textDecoration: "none", marginBottom: 8, opacity: 0.8 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
                      >
                        View Post ↗
                      </a>
                    )}

                    {/* Metrics (published only) */}
                    {post.status === "published" && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                          {[
                            { Icon: Heart,         val: post.likes },
                            { Icon: MessageCircle, val: post.comments },
                            { Icon: Repeat2,       val: post.shares },
                            { Icon: Bookmark,      val: post.saves },
                            { Icon: Eye,           val: post.impressions },
                          ].map(({ Icon, val }, i) => (
                            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--text-tertiary)" }}>
                              <Icon style={{ width: 11, height: 11 }} /> {formatSocialNumber(val)}
                            </span>
                          ))}
                          <span style={{ fontSize: 12, fontWeight: 700, color: isTop ? "#f59e0b" : "var(--text-primary)", marginLeft: "auto" }}>
                            {post.engagementRate}% eng.
                          </span>
                        </div>

                        {/* Engagement bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)" }}>
                            <div style={{ height: "100%", borderRadius: 2, width: `${engBarW}%`, background: isTop ? "#f59e0b" : p.color, opacity: 0.7 }} />
                          </div>
                          {isTop && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap" }}>
                              <Trophy style={{ width: 10, height: 10 }} /> Top performer
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Calendar View ── */}
      {view === "calendar" && (
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 14, padding: 20 }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button type="button"
                onClick={() => setCalMonth(new Date(calYear, calMonthNum - 1))}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <ChevronLeft style={{ width: 16, height: 16, color: "var(--text-secondary)" }} />
              </button>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <button type="button"
                onClick={() => setCalMonth(new Date(calYear, calMonthNum + 1))}
                style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <ChevronRight style={{ width: 16, height: 16, color: "var(--text-secondary)" }} />
              </button>
            </div>
            <button type="button"
              onClick={() => setCalMonth(new Date(TODAY_YEAR, TODAY_MONTH))}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              Today
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", padding: "6px 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day    = i + 1;
              const posts  = calendarPosts[day] || [];
              const isToday = day === TODAY_DAY && calMonthNum === TODAY_MONTH && calYear === TODAY_YEAR;
              const hasScheduled = posts.some((p) => p.status === "scheduled");
              const hasPublished = posts.some((p) => p.status === "published");

              const borderStyle = isToday
                ? `1px solid rgba(16,185,129,0.4)`
                : hasScheduled && !hasPublished
                ? `1px dashed rgba(245,158,11,0.3)`
                : `1px solid var(--glass-border-subtle, rgba(255,255,255,0.04))`;

              return (
                <div
                  key={day}
                  style={{
                    minHeight: 82, padding: 6, borderRadius: 8,
                    border: borderStyle,
                    background: isToday ? "rgba(16,185,129,0.04)" : posts.length > 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    cursor: "default",
                    position: "relative",
                  }}
                >
                  {/* Day number */}
                  <span style={{
                    fontSize: 11,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? "#10b981" : "var(--text-tertiary)",
                    display: "block", marginBottom: 3,
                  }}>
                    {day}
                  </span>

                  {/* Post chips */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {posts.slice(0, 3).map((post) => {
                      const pl  = PLATFORM_CONFIG[post.platform];
                      const iso = post.publishedAt || post.scheduledAt;
                      return (
                        <button type="button"
                          key={post.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                          style={{
                            fontSize: 9, display: "flex", alignItems: "center", gap: 3,
                            padding: "2px 5px", borderRadius: 4,
                            background: `${pl.color}12`,
                            borderLeft: `2px solid ${pl.color}${post.status === "draft" ? "40" : ""}`,
                            borderTop:    post.status === "scheduled" ? `1px dashed ${pl.color}50` : "none",
                            borderBottom: post.status === "scheduled" ? `1px dashed ${pl.color}50` : "none",
                            borderRight:  post.status === "scheduled" ? `1px dashed ${pl.color}50` : "none",
                            color: pl.color,
                            opacity: post.status === "draft" ? 0.45 : 1,
                            overflow: "hidden", whiteSpace: "nowrap",
                            cursor: "pointer", width: "100%", textAlign: "left",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = post.status === "draft" ? "0.7" : "0.8"; e.currentTarget.style.background = `${pl.color}22`; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = post.status === "draft" ? "0.45" : "1"; e.currentTarget.style.background = `${pl.color}12`; }}
                        >
                          <PlatformIcon platform={post.platform} size={10} style={{ flexShrink: 0 }} />
                          {iso && <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{fmtTime(iso)}</span>}
                        </button>
                      );
                    })}
                    {posts.length > 3 && (
                      <button type="button"
                        onClick={(e) => { e.stopPropagation(); setDayPopover({ day, posts }); }}
                        style={{
                          fontSize: 9, color: "var(--text-quaternary)", paddingLeft: 4,
                          background: "none", border: "none", cursor: "pointer", textAlign: "left",
                          transition: "color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-quaternary)"; }}
                      >
                        +{posts.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, justifyContent: "flex-end" }}>
            {[
              { label: "Published",  color: "rgba(16,185,129,0.5)",  border: "solid" },
              { label: "Scheduled",  color: "rgba(245,158,11,0.5)",  border: "dashed" },
              { label: "Draft",      color: "rgba(255,255,255,0.15)", border: "solid" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 20, height: 3, borderRadius: 2, background: l.color, borderBottom: l.border === "dashed" ? `1px dashed ${l.color}` : "none" }} />
                <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Popover */}
      {dayPopover && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDayPopover(null)}
            style={{ position: "fixed", inset: 0, zIndex: 500 }}
          />
          {/* Popover panel — centered */}
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 501, width: 360,
            background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
            padding: "18px 0 8px",
            animation: "modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
                {calMonth.toLocaleDateString("en-US", { month: "long" })} {dayPopover.day}
                <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.4)", marginLeft: 6 }}>
                  {dayPopover.posts.length} post{dayPopover.posts.length !== 1 ? "s" : ""}
                </span>
              </span>
              <button type="button"
                onClick={() => setDayPopover(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 18, lineHeight: 1, padding: "0 2px" }}
              >
                ×
              </button>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", padding: "8px 0" }}>
              {dayPopover.posts.map((post) => {
                const pl  = PLATFORM_CONFIG[post.platform];
                const iso = post.publishedAt || post.scheduledAt;
                return (
                  <button type="button"
                    key={post.id}
                    onClick={() => { setDayPopover(null); setSelectedPost(post); }}
                    style={{
                      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 18px", background: "none", border: "none", cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                      background: `${pl.color}14`, border: `1px solid ${pl.color}20`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>
                      {MEDIA_TYPE_ICONS[post.mediaType] || "📄"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <PlatformIcon platform={post.platform} size={11} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: pl.color }}>{pl.label}</span>
                        {iso && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{fmtTime(iso)}</span>}
                        {post.status !== "published" && (
                          <span style={{
                            fontSize: 9, padding: "1px 5px", borderRadius: 20, fontWeight: 700, marginLeft: "auto",
                            background: post.status === "scheduled" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                            color: post.status === "scheduled" ? "#f59e0b" : "rgba(255,255,255,0.3)",
                            border: post.status === "scheduled" ? "1px dashed rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
                            textTransform: "uppercase" as const, letterSpacing: "0.5px",
                          }}>{post.status}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {post.contentText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {selectedPost && <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
    </div>
    </ModuleErrorBoundary>
  );
}
