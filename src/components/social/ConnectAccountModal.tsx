import { useState } from "react";
import { X, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { SocialPlatformDB, SocialConnection } from "@/types/database";

// Platform brand colors for glows
const PLATFORM_STYLE: Record<SocialPlatformDB, { label: string; icon: string; color: string }> = {
  instagram: { label: "Instagram", icon: "IG", color: "#E1306C" },
  linkedin:  { label: "LinkedIn",  icon: "LI", color: "#0A66C2" },
  twitter:   { label: "Twitter / X", icon: "TW", color: "#1DA1F2" },
  facebook:  { label: "Facebook", icon: "FB", color: "#1877F2" },
  tiktok:    { label: "TikTok",   icon: "TT", color: "#FE2C55" },
  youtube:   { label: "YouTube",  icon: "YT", color: "#FF0000" },
};

interface ConnectAccountModalProps {
  platform: SocialPlatformDB;
  onClose: () => void;
  onConnected: (conn: SocialConnection) => void;
}

export function ConnectAccountModal({ platform, onClose, onConnected }: ConnectAccountModalProps) {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const p = PLATFORM_STYLE[platform];

  async function handleSave() {
    if (!handle.trim() || !displayName.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields." });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Not signed in", description: "Please sign in to connect an account." });
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("social_connections")
      .insert({
        user_id: user.id,
        platform,
        account_handle: handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`,
        account_name: displayName.trim(),
        is_active: true,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message });
      return;
    }

    toast({ title: `${p.label} connected`, description: `@${displayName} is now linked.` });
    onConnected(data);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "var(--sosa-bg-3)",
          border: "1px solid var(--sosa-border)",
          borderLeft: `3px solid ${p.color}`,
          borderRadius: 0,
          overflow: "hidden",
          position: "relative",
        }}
      >

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--sosa-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "var(--sosa-bg-2)", border: `1px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: "0.08em" }}>
              {p.icon}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>Connect {p.label}</p>
              <p style={{ fontSize: 11, color: "var(--sosa-white-20)", marginTop: 1 }}>Link your account manually</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", color: "var(--sosa-white-40)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* OAuth notice */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px", marginBottom: 20 }}>
            <Info style={{ width: 14, height: 14, color: p.color, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              Manual connection only. Enter your account handle below. Automatic OAuth sync is planned for a future release.
            </p>
          </div>

          {/* Handle */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-quaternary)", display: "block", marginBottom: 6 }}>
              Account Handle
            </label>
            <input
              type="text"
              placeholder="@username"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${p.color}50`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
              autoFocus
            />
          </div>

          {/* Display Name */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--text-quaternary)", display: "block", marginBottom: 6 }}>
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. My Brand"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${p.color}50`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button"
              onClick={onClose}
              style={{ flex: 1, padding: "10px 0", background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)", color: "var(--sosa-white-40)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}
            >
              Cancel
            </button>
            <button type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: "10px 0",
                background: "var(--sosa-yellow)",
                border: "none",
                color: "#000",
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Connecting…" : `Connect ${p.label} ↗`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
