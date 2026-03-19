import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth, getUserById, getLastLogin, type User } from "@/lib/authContext";
import { addAuditEntry, getAuditLog, subscribeAudit } from "@/lib/adminStore";
import { useTheme } from "@/lib/theme";
import { useAccent, ACCENT_PRESETS } from "@/lib/accent";
import { getProfile, updateProfile, getProfileStats, getActivityFeed, getRevenueData, type Profile, type ActivityItem } from "@/lib/profileStore";
import { exportProfilePdf } from "@/lib/profilePdfExport";
import { getUserAnalytics } from "@/lib/userAnalyticsStore";
import { ProfileTasksKanban, type ProfileTask } from "@/components/profile/ProfileTasksKanban";
import { ActivityTimeline } from "@/components/profile/ActivityTimeline";
import { RevenueChart } from "@/components/profile/RevenueChart";
import { QuickInfoCard } from "@/components/profile/QuickInfoCard";
import { SocialLinksCard } from "@/components/profile/SocialLinksCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from "recharts";

import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { OnboardingModal } from "@/components/profile/OnboardingModal";
import { RoleBadge } from "@/components/RoleBadge";
import {
  Check, Sun, Moon, Camera, MapPin, Settings, Eye, EyeOff, Lock, ShieldAlert,
  Users, FileText, DollarSign, Package, Clock as ClockIcon, Briefcase,
  TrendingUp, Activity, Zap, Download, ImagePlus, LogIn, CreditCard,
  BarChart2, Globe, Timer, Receipt,
} from "lucide-react";
import { format, differenceInMonths, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Role } from "@/lib/permissions";

/* ── Mock Tasks ── */
const MOCK_TASKS: ProfileTask[] = [
  { id: "pt1", title: "Fix login page bug", status: "in_progress", priority: "high", dueDate: new Date("2025-03-04"), assignedBy: "Sara Conti", tags: ["frontend", "bug"], comments: 3 },
  { id: "pt2", title: "Review Q1 financial docs", status: "todo", priority: "medium", dueDate: new Date("2025-03-08"), assignedBy: "Marco Verdi", tags: ["finance"], comments: 0 },
  { id: "pt3", title: "Deploy staging environment", status: "in_progress", priority: "urgent", dueDate: new Date("2025-03-02"), assignedBy: "Sara Conti", tags: ["devops"], comments: 5 },
  { id: "pt4", title: "Update API documentation", status: "done", priority: "low", dueDate: new Date("2025-02-28"), assignedBy: "Marco Verdi", tags: ["docs"], comments: 1 },
];

const DENSITY_OPTIONS = [
  { key: "comfortable" as const, label: "Comfortable" },
  { key: "compact" as const, label: "Compact" },
];

/* ── Map audit log → ActivityItem ── */
const AUDIT_TYPE_MAP: Record<string, ActivityItem["type"]> = {
  auth: "document",
  vault: "document",
  cloud: "document",
  tasks: "task",
  admin: "client",
  profile: "client",
};

function buildActivities(userId: string): ActivityItem[] {
  const auditEntries = getAuditLog().filter(e => e.userId === userId);
  const auditItems: ActivityItem[] = auditEntries.slice(0, 20).map(e => ({
    id: e.id,
    type: AUDIT_TYPE_MAP[e.category] ?? "document",
    description: e.action,
    timestamp: e.timestamp,
  }));

  // Fall back to static seed data if no live audit entries exist for this user
  if (auditItems.length === 0) return getActivityFeed(userId);

  // Merge: live audit entries first, then pad with static if fewer than 5
  if (auditItems.length < 5) {
    const staticItems = getActivityFeed(userId)
      .filter(s => !auditItems.some(a => a.description === s.description));
    return [...auditItems, ...staticItems].slice(0, 10);
  }

  return auditItems;
}

/* ── Page ── */
const ProfilePage = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  const isOwn = !userId || userId === currentUser?.id;
  const profileUser: User | undefined = isOwn ? (currentUser ?? undefined) : getUserById(userId!);
  const viewerRole = (currentUser?.role || "member") as Role;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [density, setDensity] = useState<"comfortable" | "compact">(() =>
    (localStorage.getItem("iconoff_density") as "comfortable" | "compact") || "comfortable"
  );
  const [showCF, setShowCF] = useState(false);
  const [showIBAN, setShowIBAN] = useState(false);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Load profile
  useEffect(() => {
    if (profileUser) {
      const p = getProfile(profileUser.id, profileUser.email, profileUser.displayName);
      setProfile(p);
      if (!p.onboarding_completed && isOwn) setShowOnboarding(true);
    }
  }, [profileUser?.id]);

  // Load avatar
  useEffect(() => {
    const stored = localStorage.getItem("iconoff_avatar_" + profileUser?.id);
    if (stored) setLocalAvatar(stored);
    const storedBanner = localStorage.getItem("iconoff_banner_" + profileUser?.id);
    if (storedBanner) setLocalBanner(storedBanner);
  }, [profileUser?.id]);

  // Live activity feed — driven by the audit log (must be before early return)
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    buildActivities(profileUser?.id ?? "")
  );
  useEffect(() => {
    const id = profileUser?.id ?? "";
    setActivities(buildActivities(id));
    return subscribeAudit(() => setActivities(buildActivities(id)));
  }, [profileUser?.id]);

  if (!profileUser || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>User not found</h2>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>This profile doesn't exist.</p>
      </div>
    );
  }

  const canEdit = isOwn;
  const isAdminViewer = viewerRole === "admin" || viewerRole === "owner";
  const canViewSensitive = isOwn || viewerRole === "owner";
  const avatarSrc = localAvatar || profile.avatar_url;
  const initials = (profile.first_name?.charAt(0) || "") + (profile.last_name?.charAt(0) || "");
  const stats = getProfileStats(profileUser.id);
  const revenueData = getRevenueData(profileUser.id);
  const memberSince = format(new Date(profile.created_at), "MMM yyyy");
  const tenure = differenceInMonths(new Date(), new Date(profile.created_at));
  const tenureYears = Math.floor(tenure / 12);
  const tenureMonths = tenure % 12;
  const lastLogin = getLastLogin(profileUser.id);
  const analytics = getUserAnalytics(profileUser.id);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setLocalAvatar(url);
      localStorage.setItem("iconoff_avatar_" + profileUser.id, url);
      updateProfile(profileUser.id, { avatar_url: url });
      window.dispatchEvent(new Event("avatar-changed"));
      toast.success("Avatar updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setLocalBanner(url);
      localStorage.setItem("iconoff_banner_" + profileUser.id, url);
      updateProfile(profileUser.id, { cover_image_url: url });
      toast.success("Banner updated");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleProfileSaved = (p: Profile) => {
    setProfile(p);
    window.dispatchEvent(new Event("profile-changed"));
  };

  const maskValue = (val: string, s: number, e: number) => {
    if (val.length <= s + e) return val;
    return val.slice(0, s) + "•".repeat(val.length - s - e) + val.slice(-e);
  };

  return (
    <div className="w-full px-3 md:px-5 lg:px-8 py-3 md:py-5 flex flex-col gap-4 pb-20 lg:pb-10">

      {/* ══════════ HERO / COVER ══════════ */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
        {/* Cover banner — editable */}
        <div
          className="relative h-[110px] md:h-[140px] xl:h-[170px] group cursor-pointer"
          style={{
            background: (localBanner || profile.cover_image_url)
              ? `url(${localBanner || profile.cover_image_url}) center/cover no-repeat`
              : `linear-gradient(135deg, ${profile.brand_color}30 0%, rgba(59,130,246,0.12) 50%, rgba(139,92,246,0.08) 100%)`,
          }}
          onClick={() => canEdit && bannerInputRef.current?.click()}
        >
          {/* Animated gradient overlay (only when no custom image) */}
          {!(localBanner || profile.cover_image_url) && (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 30% 50%, ${profile.brand_color}20 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(59,130,246,0.08) 0%, transparent 50%)`,
                animation: "bannerShift 20s ease infinite alternate",
              }}
            />
          )}
          {/* Edit overlay */}
          {canEdit && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <ImagePlus className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">Change Banner</span>
            </div>
          )}
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>

        {/* Profile info */}
        <div className="px-5 md:px-7 -mt-[44px] relative z-[2]">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative group shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="object-cover w-16 h-16 md:w-[88px] md:h-[88px]"
                  style={{ borderRadius: 18, border: "3px solid var(--bg-body)", boxShadow: `0 6px 20px rgba(0,0,0,0.3), 0 0 0 2px ${profile.brand_color}40` }}
                />
              ) : (
                <div className="flex items-center justify-center w-16 h-16 md:w-[88px] md:h-[88px]"
                  style={{ borderRadius: 18, border: "3px solid var(--bg-body)",
                    background: `linear-gradient(135deg, ${profile.brand_color}, ${profile.brand_color}80)`,
                    boxShadow: `0 6px 20px rgba(0,0,0,0.3), 0 0 20px ${profile.brand_color}30`,
                  }}>
                  <span className="text-[28px] font-bold text-white">{initials}</span>
                </div>
              )}
              {canEdit && (
                <div onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ borderRadius: 18, backgroundColor: "rgba(0,0,0,0.5)" }}>
                  <Camera className="w-4 h-4 text-white" />
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name & meta */}
            <div className="flex-1 pb-1.5 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-[18px] md:text-[24px] font-bold" style={{ color: "var(--text-primary)", lineHeight: 1.2 }}>
                  {profile.display_name || profile.first_name}
                </h1>
                <RoleBadge role={profileUser.role as Role} />
              </div>
              <p className="text-[14px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {profile.job_title || "No title set"} {profile.company_name ? `@ ${profile.company_name}` : ""}
              </p>
              <p className="text-[12px] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-tertiary)" }}>
                {profile.city && <><MapPin className="w-3 h-3" /> {profile.city}, {profile.country}</>}
                {profile.city && <span>·</span>}
                Member since {memberSince}
                <span>·</span>
                <span className="flex items-center gap-1" style={{ color: lastLogin ? "#22c55e" : "var(--text-quaternary)" }}>
                  <LogIn className="w-3 h-3" />
                  {lastLogin ? `Last login ${formatDistanceToNow(lastLogin, { addSuffix: true })}` : "Never logged in"}
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-3 pb-4">
            {canEdit && (
              <button type="button" onClick={() => setEditOpen(true)}
                className="glass-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-[12px]">
                <Camera className="w-3 h-3" /> Edit Profile
              </button>
            )}
            {isAdminViewer && (
              <button type="button" onClick={() => { exportProfilePdf(profile); toast.success("PDF downloaded"); }}
                className="glass-btn flex items-center gap-1.5 px-3.5 py-1.5 text-[12px]">
                <Download className="w-3 h-3" /> Download PDF
              </button>
            )}
            <button type="button" onClick={() => toast.info("Settings")}
              className="glass-btn flex items-center gap-1.5 px-3.5 py-1.5 text-[12px]">
              <Settings className="w-3 h-3" /> Settings
            </button>
          </div>
        </div>
      </div>


      {/* ══════════ MAIN CONTENT: TWO COLUMNS ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_400px] 2xl:grid-cols-[1fr_440px] gap-5">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Activity Timeline */}
          <GlassSection title="Recent Activity" icon={<Activity className="w-4 h-4" />} className="flex-1">
            <ActivityTimeline activities={activities} />
          </GlassSection>


          {/* Sensitive Data */}
          {canViewSensitive && profile.tax_id && (
            <GlassSection
              title="Sensitive Data"
              icon={<ShieldAlert className="w-4 h-4" style={{ color: "#f87171" }} />}
              badge={<span className="flex items-center gap-1 text-[10px]" style={{ color: "#f87171" }}><Lock className="w-3 h-3" /> Protected</span>}
            >
              <MaskedField label="Tax ID" value={profile.tax_id} maskedValue={maskValue(profile.tax_id, 4, 1)} show={showCF} onToggle={() => { setShowCF(!showCF); if (!showCF) { toast.info("Tax ID revealed — logged"); addAuditEntry({ userId: user?.id ?? "unknown", action: `Revealed Tax ID for ${profile.full_name || "user"}`, category: "profile", details: "Sensitive fiscal data accessed", icon: "💰" }); } }} />
              <div className="flex items-center gap-1.5 text-[10px] rounded-[var(--radius-sm)] p-2 mt-1" style={{ color: "var(--text-tertiary)", background: "var(--glass-bg-subtle)" }}>
                <Lock className="w-3 h-3 shrink-0" /> Every reveal is recorded in the audit log.
              </div>
            </GlassSection>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">
          {/* Quick Info */}
          <GlassSection title="Quick Info" icon={<Briefcase className="w-4 h-4" />}>
            <QuickInfoCard profile={profile} onEdit={() => setEditOpen(true)} />
          </GlassSection>

          {/* Social Links */}
          <GlassSection title="Social Links" icon={<Zap className="w-4 h-4" />}>
            <SocialLinksCard profile={profile} onEdit={() => setEditOpen(true)} onProfileUpdate={setProfile} />
          </GlassSection>


        </div>
      </div>

      {/* ══════════ TASKS ══════════ */}
      <ProfileTasksKanban tasks={MOCK_TASKS} canManage={isAdminViewer} />

      {/* ══════════ USER ANALYTICS (admin view) ══════════ */}
      {isAdminViewer && <UserAnalyticsSection analytics={analytics} lastLogin={lastLogin} profileUser={profileUser} />}

      {/* ══════════ PERSONALIZATION ══════════ */}
      {isOwn && (
        <GlassSection title="Personalization">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Theme */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-quaternary)" }}>Theme</label>
              <div className="flex gap-2.5">
                {([
                  { value: "light" as const, icon: <Sun className="w-3.5 h-3.5" />, label: "Light", preview: "#f0f0f5" },
                  { value: "dark" as const, icon: <Moon className="w-3.5 h-3.5" />, label: "Dark", preview: "#0d1117" },
                ] as const).map((opt) => (
                  <button type="button" key={opt.value} onClick={() => setTheme(opt.value)} className="relative flex flex-col items-center gap-1">
                    <div className="flex items-center justify-center" style={{
                      width: 60, height: 40, borderRadius: 10, background: opt.preview,
                      border: theme === opt.value ? "2px solid var(--accent-color)" : "2px solid var(--glass-border)",
                      boxShadow: theme === opt.value ? "0 0 0 2px var(--accent-dim)" : "none",
                    }}>
                      <span style={{ color: opt.value === "dark" ? "#fff" : "#111" }}>{opt.icon}</span>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: theme === opt.value ? "var(--text-primary)" : "var(--text-tertiary)" }}>{opt.label}</span>
                    {theme === opt.value && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--accent-color)" }}>
                        <Check className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-quaternary)" }}>Accent Color</label>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_PRESETS.map((preset) => (
                  <button type="button" key={preset.id} onClick={() => setAccent(preset.id)}
                    className="relative flex items-center justify-center transition-all duration-150 hover:scale-110"
                    style={{
                      width: 28, height: 28, borderRadius: "50%", backgroundColor: preset.swatch,
                      border: accent === preset.id ? "3px solid rgba(255,255,255,0.8)" : "3px solid transparent",
                      boxShadow: accent === preset.id ? "0 0 0 2px rgba(255,255,255,0.15)" : "none",
                    }}
                    title={preset.label}>
                    {accent === preset.id && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Density */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-quaternary)" }}>Layout Density</label>
              <div className="glass-segment">
                {DENSITY_OPTIONS.map((opt) => (
                  <button type="button" key={opt.key} onClick={() => { setDensity(opt.key); localStorage.setItem("iconoff_density", opt.key); }}
                    className="glass-segment-item" data-active={density === opt.key}>{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        </GlassSection>
      )}

      {!isOwn && (
        <p className="text-xs text-center italic" style={{ color: "var(--text-tertiary)" }}>
          Viewing {profileUser.displayName}'s profile
        </p>
      )}

      {/* Modals */}
      <EditProfileModal profile={profile} open={editOpen} onClose={() => setEditOpen(false)} onSaved={handleProfileSaved} />
      <OnboardingModal profile={profile} open={showOnboarding} onComplete={(p) => { setProfile(p); setShowOnboarding(false); }} />
    </div>
  );
};

/* ── User Analytics Section ── */
function UserAnalyticsSection({ analytics, lastLogin, profileUser }: {
  analytics: ReturnType<typeof getUserAnalytics>;
  lastLogin: Date | null;
  profileUser: User;
}) {
  const { paymentStats: ps, activityByDay, portalsActivity, totalSessions, totalLogins, avgSessionMinutes } = analytics;
  const maxActivity = Math.max(...activityByDay.map(d => d.actions), 1);

  const statusData = [
    { name: "Paid", value: ps.paid, color: "#22c55e" },
    { name: "Pending", value: ps.pending, color: "#f59e0b" },
    { name: "Overdue", value: ps.overdue, color: "#ef4444" },
    { name: "Draft", value: ps.draft, color: "var(--text-quaternary)" },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1" style={{ borderBottom: "1px solid var(--divider)" }}>
        <BarChart2 className="w-4 h-4" style={{ color: "var(--text-quaternary)" }} />
        <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Analytics & Activity</h2>
        {lastLogin && (
          <span className="flex items-center gap-1 ml-auto text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "0.5px solid rgba(34,197,94,0.3)" }}>
            <LogIn className="w-3 h-3" />
            Last login: {format(lastLogin, "MMM d, yyyy 'at' HH:mm")}
          </span>
        )}
        {!lastLogin && (
          <span className="flex items-center gap-1 ml-auto text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: "var(--glass-bg)", color: "var(--text-quaternary)", border: "0.5px solid var(--glass-border)" }}>
            <LogIn className="w-3 h-3" /> Never logged in
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { icon: <Receipt className="w-4 h-4" />, bg: "rgba(99,102,241,0.15)", color: "#818cf8", label: "Invoices Sent", value: String(ps.totalInvoices) },
          { icon: <DollarSign className="w-4 h-4" />, bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Revenue Processed", value: `€${(ps.totalRevenue / 1000).toFixed(0)}k` },
          { icon: <CreditCard className="w-4 h-4" />, bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Paid Invoices", value: String(ps.paid) },
          { icon: <Timer className="w-4 h-4" />, bg: "rgba(59,130,246,0.12)", color: "#60a5fa", label: "Avg Session", value: `${avgSessionMinutes}m` },
          { icon: <LogIn className="w-4 h-4" />, bg: "rgba(168,85,247,0.12)", color: "#c084fc", label: "Total Logins", value: String(totalLogins) },
          { icon: <Globe className="w-4 h-4" />, bg: "rgba(20,184,166,0.12)", color: "#2dd4bf", label: "Active Portals", value: String(portalsActivity.filter(p => p.sessions > 0).length) },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3.5" style={{ background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)" }}>
            <div className="flex items-center justify-center mb-2" style={{ width: 30, height: 30, borderRadius: 8, background: k.bg, color: k.color }}>
              {k.icon}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-quaternary)" }}>{k.label}</p>
            <p className="text-[20px] font-bold" style={{ color: "var(--text-primary)" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">

        {/* Activity over 14 days */}
        <GlassSection title="Activity — Last 14 Days" icon={<Activity className="w-4 h-4" />}>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityByDay} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(255,255,255,0.05))" />
                <XAxis dataKey="short" tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(13,17,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }}
                  formatter={(v: number) => [v, "Actions"]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.day ?? ""}
                />
                <Bar dataKey="actions" fill="var(--accent-color, #818cf8)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassSection>

        {/* Invoice status donut */}
        <GlassSection title="Invoice Status" icon={<FileText className="w-4 h-4" />}>
          <div className="flex flex-col items-center gap-3">
            <div style={{ height: 120 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={34} outerRadius={54} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassSection>
      </div>

      {/* Monthly invoices + revenue chart */}
      <GlassSection title="Monthly Revenue Processed" icon={<TrendingUp className="w-4 h-4" />}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ps.monthly} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-color, #818cf8)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent-color, #818cf8)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(255,255,255,0.05))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-quaternary)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "rgba(13,17,23,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }}
                formatter={(v: number, name: string) => [name === "revenue" ? `€${v.toLocaleString()}` : v, name === "revenue" ? "Revenue" : "Invoices"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent-color, #818cf8)" strokeWidth={2} fill="url(#analyticsRevGrad)" animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassSection>

      {/* Portal usage */}
      <GlassSection title="Portal Usage" icon={<Globe className="w-4 h-4" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {portalsActivity.map(p => (
            <div key={p.portalId} className="rounded-xl p-4" style={{ background: `${p.accent}08`, border: `0.5px solid ${p.accent}30` }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 13, fontWeight: 700, color: p.accent }}>{p.portalName}</span>
                <span style={{ fontSize: 10, color: "var(--text-quaternary)" }}>
                  {p.lastActiveDaysAgo === 0 ? "Today" : `${p.lastActiveDaysAgo}d ago`}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Sessions</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{p.sessions}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Actions</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{p.actionsCount}</span>
                </div>
                {/* Mini usage bar */}
                <div style={{ height: 4, borderRadius: 2, background: "var(--glass-border)", marginTop: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (p.sessions / 50) * 100)}%`, background: p.accent, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassSection>
    </div>
  );
}

/* ── Sub Components ── */
function StatCard({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] p-3.5 transition-all duration-150 hover:-translate-y-0.5"
      style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
      <div className="flex items-center justify-center mb-2" style={{ width: 30, height: 30, borderRadius: 8, background: iconBg }}>{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-quaternary)" }}>{label}</p>
      <p className="text-[18px] font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

function GlassSection({ title, icon, badge, children, className }: { title: string; icon?: React.ReactNode; badge?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-xl)] p-5 ${className || ""}`} style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
      <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: "1px solid var(--divider)" }}>
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: "var(--text-quaternary)" }}>{icon}</span>}
          <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}

function MaskedField({ label, value, maskedValue, show, onToggle }: { label: string; value: string; maskedValue: string; show: boolean; onToggle: () => void }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-quaternary)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input className="glass-input flex-1 px-3 py-2 text-[13px] font-mono" value={show ? value : maskedValue} readOnly />
        <button type="button" onClick={onToggle} className="glass-btn p-1.5 shrink-0" title={show ? "Hide" : "Show"}>
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
