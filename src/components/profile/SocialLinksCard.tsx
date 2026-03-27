import { useState } from "react";
import { Linkedin, Instagram, Hash, Plus, X, ExternalLink, Globe } from "lucide-react";
import type { Profile } from "@/lib/profileStore";
import { updateProfile } from "@/lib/profileStore";
import { toast } from "sonner";

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

interface Props {
  profile: Profile;
  onEdit: () => void;
  onProfileUpdate?: (p: Profile) => void;
}

const FIXED_LINKS = [
  { key: "linkedin_url" as const, icon: <Linkedin className="w-5 h-5" />, label: "LinkedIn", color: "#0A66C2", bg: "rgba(10,102,194,0.12)", placeholder: "https://linkedin.com/in/...", isTag: false },
  { key: "instagram_url" as const, icon: <Instagram className="w-5 h-5" />, label: "Instagram", color: "#E4405F", bg: "rgba(228,64,95,0.12)", placeholder: "https://instagram.com/...", isTag: false },
  { key: "discord_tag" as const, icon: <DiscordIcon className="w-5 h-5" />, label: "Discord", color: "#5865F2", bg: "rgba(88,101,242,0.12)", placeholder: "username#0000", isTag: true },
  { key: "slack_tag" as const, icon: <Hash className="w-5 h-5" />, label: "Slack Tag", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", placeholder: "@username", isTag: true },
];

export function SocialLinksCard({ profile, onEdit, onProfileUpdate }: Props) {
  const [addingExtra, setAddingExtra] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const extras: { label: string; url: string }[] = profile.extra_socials || [];

  const handleAddExtra = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const updated = updateProfile(profile.id, {
      extra_socials: [...extras, { label: newLabel.trim(), url: newUrl.trim() }],
    });
    onProfileUpdate?.(updated);
    setNewLabel("");
    setNewUrl("");
    setAddingExtra(false);
    toast.success("Link added");
  };

  const handleRemoveExtra = (idx: number) => {
    const updated = updateProfile(profile.id, {
      extra_socials: extras.filter((_, i) => i !== idx),
    });
    onProfileUpdate?.(updated);
    toast.success("Link removed");
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* Fixed links: LinkedIn, Instagram, Slack */}
      {FIXED_LINKS.map((s) => {
        const value = profile[s.key];
        return (
          <div
            key={s.key}
            className="flex items-center gap-3 rounded-xl transition-all duration-150 group"
            style={{
              background: "var(--glass-bg-subtle)",
              border: "0.5px solid var(--glass-border)",
              padding: "16px 18px",
            }}
          >
            {/* Icon pill */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 44, height: 44, borderRadius: 12, background: s.bg }}
            >
              <span style={{ color: s.color, display: "flex" }}>{s.icon}</span>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {s.label}
              </span>
              {value ? (
                s.isTag ? (
                  <span className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{value}</span>
                ) : (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14px] font-medium truncate hover:underline flex items-center gap-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {value.replace(/^https?:\/\//, "")}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" style={{ color: "var(--text-quaternary)" }} />
                  </a>
                )
              ) : (
                <button type="button"
                  onClick={onEdit}
                  className="text-left text-[12px]"
                  style={{ color: "var(--text-quaternary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {s.placeholder}
                </button>
              )}
            </div>

            {/* Connected dot */}
            {value && (
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}80` }} />
            )}
          </div>
        );
      })}

      {/* Extra socials */}
      {extras.map((extra, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 rounded-xl transition-all duration-150 group"
          style={{ background: "var(--glass-bg-subtle)", border: "0.5px solid var(--glass-border)", padding: "12px 16px" }}
        >
          <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.05)" }}>
            <Globe className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-quaternary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{extra.label}</span>
            <a href={extra.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium truncate hover:underline" style={{ color: "var(--text-primary)" }}>
              {extra.url.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <button type="button"
            onClick={() => handleRemoveExtra(idx)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
          </button>
        </div>
      ))}

      {/* Add extra link */}
      {addingExtra ? (
        <div className="flex flex-col gap-2.5 p-4 rounded-xl" style={{ background: "var(--glass-bg-subtle)", border: "0.5px solid var(--glass-border)" }}>
          <input
            className="glass-input w-full text-[13px]"
            placeholder="Label (e.g. Twitter, GitHub)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ padding: "8px 12px" }}
            autoFocus
          />
          <input
            className="glass-input w-full text-[13px]"
            placeholder="URL or handle"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            style={{ padding: "8px 12px" }}
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleAddExtra} className="glass-btn-primary px-4 py-1.5 text-[12px] flex-1">Add Link</button>
            <button type="button" onClick={() => { setAddingExtra(false); setNewLabel(""); setNewUrl(""); }} className="glass-btn px-4 py-1.5 text-[12px]">Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button"
          onClick={() => setAddingExtra(true)}
          className="flex items-center gap-2.5 rounded-xl text-[13px] transition-all duration-150 hover:opacity-80"
          style={{
            color: "var(--text-tertiary)",
            background: "var(--glass-bg-subtle)",
            border: "1px dashed var(--glass-border)",
            padding: "16px 18px",
          }}
        >
          <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)" }}>
            <Plus className="w-5 h-5" />
          </div>
          <span style={{ fontWeight: 500 }}>Add another link</span>
        </button>
      )}
    </div>
  );
}
