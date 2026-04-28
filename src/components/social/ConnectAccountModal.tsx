import { useState } from "react";
import { X, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type { SocialPlatformDB, SocialConnection } from "@/types/database";

// Platform brand colors for glows
const PLATFORM_STYLE: Record<SocialPlatformDB, { label: string; icon: string; color: string; gradient: string }> = {
  instagram: { label: "Instagram", icon: "📸", color: "#E1306C", gradient: "linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)" },
  linkedin: { label: "LinkedIn", icon: "🔵", color: "#0A66C2", gradient: "linear-gradient(135deg,#0a66c2,#0077b5)" },
  twitter: { label: "Twitter / X", icon: "🐦", color: "#1DA1F2", gradient: "linear-gradient(135deg,#1da1f2,#0d8ecf)" },
  facebook: { label: "Facebook", icon: "📘", color: "#1877F2", gradient: "linear-gradient(135deg,#1877f2,#0062cc)" },
  tiktok: { label: "TikTok", icon: "🎵", color: "#FE2C55", gradient: "linear-gradient(135deg,#fe2c55,#25f4ee)" },
  youtube: { label: "YouTube", icon: "🔴", color: "#FF0000", gradient: "linear-gradient(135deg,#ff0000,#cc0000)" },
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
        backdropFilter: "blur(12px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "rgba(8,12,24,0.92)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 60px ${p.color}18`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Ambient color orb */}
        <div
          style={{
            position: "absolute", top: -40, right: -40,
            width: 140, height: 140,
            background: p.color,
            borderRadius: "50%",
            filter: "blur(60px)",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${p.color}20`, border: `1px solid ${p.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {p.icon}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Connect {p.label}</p>
              <p style={{ fontSize: 11, color: "var(--text-quaternary)", marginTop: 1 }}>Link your account manually</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-quaternary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
            <button type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 2, padding: "10px 0", borderRadius: 10,
                background: saving ? "rgba(255,255,255,0.05)" : p.color,
                border: "none",
                color: saving ? "var(--text-quaternary)" : "#fff",
                fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "opacity 0.2s",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Connecting…" : `Connect ${p.label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
