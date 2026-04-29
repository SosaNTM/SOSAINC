import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth, getUserById, getLastLogin, type User } from "@/lib/authContext";
import { STORAGE_AVATAR_PREFIX, STORAGE_BANNER_PREFIX } from "@/constants/storageKeys";
import { addAuditEntry } from "@/lib/adminStore";
import { useTheme } from "@/lib/theme";
import { useAccent, ACCENT_PRESETS } from "@/lib/accent";
import { getProfile, updateProfile, getProfileStats, type Profile } from "@/lib/profileStore";
import { uploadAvatar, uploadBanner } from "@/lib/profileUploadService";
import { exportProfilePdf } from "@/lib/profilePdfExport";
import { QuickInfoCard } from "@/components/profile/QuickInfoCard";
import { SocialLinksCard } from "@/components/profile/SocialLinksCard";
import { ProfileTasksCard } from "@/components/profile/ProfileTasksCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { OnboardingModal } from "@/components/profile/OnboardingModal";
import { RoleBadge } from "@/components/RoleBadge";
import {
  Check, Sun, Moon, Camera, MapPin, Settings, Eye, EyeOff, Lock, ShieldAlert,
  Briefcase, Zap, Download, ImagePlus, LogIn, Loader2, Landmark,
} from "lucide-react";
import { format, differenceInMonths, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Role } from "@/lib/permissions";
import { usePortalDB } from "@/lib/portalContextDB";

/* ── Page ── */
const ProfilePage = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user: currentUser } = useAuth();
  const { userRole: dbRole } = usePortalDB();
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  const isOwn = !userId || userId === currentUser?.id;
  const profileUser: User | undefined = isOwn ? (currentUser ?? undefined) : getUserById(userId!);
  const viewerRole = ((dbRole ?? currentUser?.role) || "member") as Role;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [localBanner, setLocalBanner] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCF, setShowCF] = useState(false);
  const [showIBAN, setShowIBAN] = useState(false);
  const [showVAT, setShowVAT] = useState(false);
  const [showSWIFT, setShowSWIFT] = useState(false);
  const [showBankIBAN, setShowBankIBAN] = useState(false);
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

  // Load cached avatar / banner
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_AVATAR_PREFIX + profileUser?.id);
    if (stored) setLocalAvatar(stored);
    const storedBanner = localStorage.getItem(STORAGE_BANNER_PREFIX + profileUser?.id);
    if (storedBanner) setLocalBanner(storedBanner);
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
  const bannerSrc = localBanner || profile.cover_image_url;
  const initials = (profile.first_name?.charAt(0) || "") + (profile.last_name?.charAt(0) || "");
  const stats = getProfileStats(profileUser.id);
  const memberSince = format(new Date(profile.created_at), "MMM yyyy");
  const lastLogin = getLastLogin(profileUser.id);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await uploadAvatar(profileUser.id, file);
      setLocalAvatar(result.url);
      if (result.source === "local") {
        localStorage.setItem(STORAGE_AVATAR_PREFIX + profileUser.id, result.url);
      }
      updateProfile(profileUser.id, { avatar_url: result.url });
      window.dispatchEvent(new Event("avatar-changed"));
      toast.success("Avatar updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingBanner(true);
    try {
      const result = await uploadBanner(profileUser.id, file);
      setLocalBanner(result.url);
      if (result.source === "local") {
        localStorage.setItem(STORAGE_BANNER_PREFIX + profileUser.id, result.url);
      }
      updateProfile(profileUser.id, { cover_image_url: result.url });
      toast.success("Banner updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleProfileSaved = (p: Profile) => {
    setProfile(p);
    window.dispatchEvent(new Event("profile-changed"));
  };

  const handleDownloadPdf = async () => {
    try {
      await exportProfilePdf(profile);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const maskValue = (val: string, s: number, e: number) => {
    if (val.length <= s + e) return val;
    return val.slice(0, s) + "•".repeat(val.length - s - e) + val.slice(-e);
  };

  const maskIBAN = (iban: string) => {
    const raw = iban.replace(/\s/g, "");
    if (raw.length <= 7) return iban;
    const groups = raw.match(/.{1,4}/g) ?? [];
    return groups
      .map((g, i) => (i === 0 || i === groups.length - 1 ? g : "••••"))
      .join(" ");
  };

  const hasSensitiveData = canViewSensitive && (profile.tax_id || profile.iban);
  const hasBankingData = canViewSensitive && (profile.iban || profile.vat_number || profile.bank_name || profile.swift_bic || profile.account_holder_name);

  return (
    <div className="w-full px-3 md:px-5 lg:px-8 py-3 md:py-5 flex flex-col gap-4 pb-10">

      {/* ══════════ HERO / COVER ══════════ */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
        {/* Cover banner */}
        <div
          className="relative h-[110px] md:h-[140px] xl:h-[170px] group cursor-pointer"
          style={{
            background: bannerSrc
              ? undefined
              : `linear-gradient(135deg, ${profile.brand_color}30 0%, rgba(59,130,246,0.12) 50%, rgba(139,92,246,0.08) 100%)`,
          }}
          onClick={() => canEdit && !uploadingBanner && bannerInputRef.current?.click()}
        >
          {/* Actual banner image — use <img> so GIFs animate */}
          {bannerSrc && (
            <img
              src={bannerSrc}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Animated gradient overlay (only when no custom image) */}
          {!bannerSrc && (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 30% 50%, ${profile.brand_color}20 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(59,130,246,0.08) 0%, transparent 50%)`,
                animation: "bannerShift 20s ease infinite alternate",
              }}
            />
          )}
          {/* Upload loading overlay */}
          {uploadingBanner && (
            <div className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: "rgba(0,0,0,0.55)" }}>
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          {/* Edit hover overlay */}
          {canEdit && !uploadingBanner && (
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <ImagePlus className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium">Change Banner</span>
            </div>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            onChange={handleBannerChange}
          />
        </div>

        {/* Profile info */}
        <div className="px-5 md:px-7 -mt-[44px] relative z-[2]">
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative group shrink-0">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  className="object-cover w-16 h-16 md:w-[88px] md:h-[88px]"
                  style={{
                    borderRadius: 18,
                    border: "3px solid var(--bg-body)",
                    boxShadow: `0 6px 20px rgba(0,0,0,0.3), 0 0 0 2px ${profile.brand_color}40`,
                  }}
                />
              ) : (
                <div
                  className="flex items-center justify-center w-16 h-16 md:w-[88px] md:h-[88px]"
                  style={{
                    borderRadius: 18,
                    border: "3px solid var(--bg-body)",
                    background: `linear-gradient(135deg, ${profile.brand_color}, ${profile.brand_color}80)`,
                    boxShadow: `0 6px 20px rgba(0,0,0,0.3), 0 0 20px ${profile.brand_color}30`,
                  }}
                >
                  <span className="text-[28px] font-bold text-white">{initials}</span>
                </div>
              )}
              {/* Upload spinner overlay */}
              {uploadingAvatar && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ borderRadius: 18, backgroundColor: "rgba(0,0,0,0.6)" }}
                >
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
              {/* Edit hover overlay */}
              {canEdit && !uploadingAvatar && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ borderRadius: 18, backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                  <Camera className="w-4 h-4 text-white" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
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
                <Settings className="w-3 h-3" /> Edit Profile
              </button>
            )}
            {isAdminViewer && (
              <button type="button" onClick={handleDownloadPdf}
                className="glass-btn flex items-center gap-1.5 px-3.5 py-1.5 text-[12px]">
                <Download className="w-3 h-3" /> Download PDF
              </button>
            )}
          </div>
        </div>
      </div>


      {/* ══════════ MAIN CONTENT ══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Quick Info */}
        <GlassSection title="Quick Info" icon={<Briefcase className="w-4 h-4" />}>
          <QuickInfoCard profile={profile} onEdit={() => setEditOpen(true)} />
        </GlassSection>

        {/* Social Links */}
        <GlassSection title="Social Links" icon={<Zap className="w-4 h-4" />}>
          <SocialLinksCard profile={profile} onEdit={() => setEditOpen(true)} onProfileUpdate={setProfile} />
        </GlassSection>

        {/* Sensitive Data */}
        {(hasSensitiveData || canViewSensitive) && (
          <GlassSection
            title="Sensitive Data"
            icon={<ShieldAlert className="w-4 h-4" style={{ color: "#f87171" }} />}
            badge={<span className="flex items-center gap-1 text-[10px]" style={{ color: "#f87171" }}><Lock className="w-3 h-3" /> Protected</span>}
          >
            {!profile.tax_id && !profile.iban && (
              <div className="p-3 mb-2 rounded-[var(--radius-sm)] text-center" style={{ background: "var(--glass-bg-subtle)", color: "var(--text-quaternary)", fontSize: 12 }}>
                No sensitive data on file
              </div>
            )}
            {profile.tax_id && (
              <MaskedField
                label="Tax ID"
                value={profile.tax_id}
                maskedValue={maskValue(profile.tax_id, 4, 1)}
                show={showCF}
                onToggle={() => {
                  setShowCF(!showCF);
                  if (!showCF) {
                    toast.info("Tax ID revealed — logged");
                    addAuditEntry({
                      userId: currentUser?.id ?? "unknown",
                      action: `Revealed Tax ID for ${profile.display_name || "user"}`,
                      category: "profile",
                      details: "Sensitive fiscal data accessed",
                      icon: "💰",
                    });
                  }
                }}
              />
            )}
            {profile.iban && (
              <MaskedField
                label="IBAN"
                value={profile.iban}
                maskedValue={maskIBAN(profile.iban)}
                show={showIBAN}
                onToggle={() => {
                  setShowIBAN(!showIBAN);
                  if (!showIBAN) {
                    toast.info("IBAN revealed — logged");
                    addAuditEntry({
                      userId: currentUser?.id ?? "unknown",
                      action: `Revealed IBAN for ${profile.display_name || "user"}`,
                      category: "profile",
                      details: "Sensitive banking data accessed",
                      icon: "🏦",
                    });
                  }
                }}
              />
            )}
            <div
              className="flex items-center gap-1.5 text-[10px] rounded-[var(--radius-sm)] p-2 mt-1"
              style={{ color: "var(--text-tertiary)", background: "var(--glass-bg-subtle)" }}
            >
              <Lock className="w-3 h-3 shrink-0" /> Every reveal is recorded in the audit log.
            </div>
          </GlassSection>
        )}

        {/* Banking & VAT */}
        {(hasBankingData || canEdit || canViewSensitive) && (
          <GlassSection
            title="Banking & VAT"
            icon={<Landmark className="w-4 h-4" style={{ color: "#60a5fa" }} />}
            badge={<span className="flex items-center gap-1 text-[10px]" style={{ color: "#60a5fa" }}><Lock className="w-3 h-3" /> Private</span>}
          >
            {(profile.account_holder_name || profile.bank_name) ? (
              <div className="flex flex-col gap-0.5 mb-3 p-3 rounded-[var(--radius-sm)]" style={{ background: "var(--glass-bg-subtle)" }}>
                {profile.account_holder_name && (
                  <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{profile.account_holder_name}</span>
                )}
                {profile.bank_name && (
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{profile.bank_name}</span>
                )}
              </div>
            ) : canEdit ? (
              <div
                className="flex items-center justify-center gap-2 p-4 mb-3 rounded-[var(--radius-sm)] cursor-pointer"
                style={{ border: "1px dashed var(--glass-border)", color: "var(--text-quaternary)", fontSize: 12 }}
                onClick={() => setEditOpen(true)}
              >
                + Add bank details
              </div>
            ) : (
              <div className="p-3 mb-3 rounded-[var(--radius-sm)] text-center" style={{ background: "var(--glass-bg-subtle)", color: "var(--text-quaternary)", fontSize: 12 }}>
                No banking details on file
              </div>
            )}

            {profile.iban && (
              <MaskedField
                label="IBAN"
                value={profile.iban}
                maskedValue={maskIBAN(profile.iban)}
                show={showBankIBAN}
                onToggle={() => {
                  setShowBankIBAN(!showBankIBAN);
                  if (!showBankIBAN) {
                    toast.info("IBAN revealed — logged");
                    addAuditEntry({
                      userId: currentUser?.id ?? "unknown",
                      action: `Revealed IBAN for ${profile.display_name || "user"}`,
                      category: "profile",
                      details: "Banking data accessed",
                      icon: "🏦",
                    });
                  }
                }}
              />
            )}
            {profile.swift_bic && (
              <MaskedField
                label="SWIFT / BIC"
                value={profile.swift_bic}
                maskedValue={maskValue(profile.swift_bic, 4, 2)}
                show={showSWIFT}
                onToggle={() => {
                  setShowSWIFT(!showSWIFT);
                  if (!showSWIFT) {
                    addAuditEntry({
                      userId: currentUser?.id ?? "unknown",
                      action: `Revealed SWIFT for ${profile.display_name || "user"}`,
                      category: "profile",
                      details: "Banking data accessed",
                      icon: "🏦",
                    });
                  }
                }}
              />
            )}
            {profile.vat_number && (
              <MaskedField
                label="VAT Number"
                value={profile.vat_number}
                maskedValue={maskValue(profile.vat_number, 4, 2)}
                show={showVAT}
                onToggle={() => {
                  setShowVAT(!showVAT);
                  if (!showVAT) {
                    addAuditEntry({
                      userId: currentUser?.id ?? "unknown",
                      action: `Revealed VAT for ${profile.display_name || "user"}`,
                      category: "profile",
                      details: "Fiscal data accessed",
                      icon: "💼",
                    });
                  }
                }}
              />
            )}
            {!profile.iban && !profile.vat_number && !profile.swift_bic && !profile.account_holder_name && !profile.bank_name && (
              <p className="text-[12px] text-center py-2" style={{ color: "var(--text-quaternary)" }}>No banking data — edit profile to add</p>
            )}
            <div
              className="flex items-center gap-1.5 text-[10px] rounded-[var(--radius-sm)] p-2 mt-1"
              style={{ color: "var(--text-tertiary)", background: "var(--glass-bg-subtle)" }}
            >
              <Lock className="w-3 h-3 shrink-0" /> Visible only to you and the Owner.
            </div>
          </GlassSection>
        )}
      </div>

      {/* ══════════ TASKS ══════════ */}
      <ProfileTasksCard userId={profileUser.id} />

      {/* ══════════ PERSONALIZATION ══════════ */}
      {isOwn && (
        <GlassSection title="Personalization">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Theme */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider mb-2 block" style={{ color: "var(--text-quaternary)" }}>Theme</label>
              <div className="flex gap-2.5">
                {([
                  { value: "light" as const, icon: <Sun className="w-3.5 h-3.5" />, label: "Light", preview: "#f0f0f5" },
                  { value: "dark" as const, icon: <Moon className="w-3.5 h-3.5" />, label: "Dark", preview: "#0d1117" },
                ] as const).map((opt) => (
                  <button type="button" key={opt.value} onClick={() => setTheme(opt.value)} className="relative flex flex-col items-center gap-1">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 60, height: 40, borderRadius: 10, background: opt.preview,
                        border: theme === opt.value ? "2px solid var(--accent-color)" : "2px solid var(--glass-border)",
                        boxShadow: theme === opt.value ? "0 0 0 2px var(--accent-dim)" : "none",
                      }}
                    >
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
                  <button
                    type="button"
                    key={preset.id}
                    onClick={() => setAccent(preset.id)}
                    className="relative flex items-center justify-center transition-all duration-150 hover:scale-110"
                    style={{
                      width: 28, height: 28, borderRadius: "50%", backgroundColor: preset.swatch,
                      border: accent === preset.id ? "3px solid rgba(255,255,255,0.8)" : "3px solid transparent",
                      boxShadow: accent === preset.id ? "0 0 0 2px rgba(255,255,255,0.15)" : "none",
                    }}
                    title={preset.label}
                  >
                    {accent === preset.id && <Check className="w-3 h-3 text-white" />}
                  </button>
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

/* ── Sub Components ── */
function GlassSection({
  title, icon, badge, children, className, style,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-[var(--radius-xl)] p-5 ${className || ""}`}
      style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", ...style }}
    >
      <div className="flex items-center justify-between mb-4 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--divider)" }}>
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: "var(--text-quaternary)" }}>{icon}</span>}
          <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        </div>
        {badge}
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

function MaskedField({
  label, value, maskedValue, show, onToggle,
}: {
  label: string;
  value: string;
  maskedValue: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-quaternary)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          className="glass-input flex-1 px-3 py-2 text-[13px] font-mono"
          value={show ? value : maskedValue}
          readOnly
        />
        <button type="button" onClick={onToggle} className="glass-btn p-1.5 shrink-0" title={show ? "Hide" : "Show"}>
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
