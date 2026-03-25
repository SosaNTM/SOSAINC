import { useState } from "react";
import { Share2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  SettingsPageHeader, SettingsCard, SettingsToggle,
} from "@/components/settings";

type Platform = "instagram" | "x" | "linkedin" | "tiktok" | "youtube" | "facebook";
type Status = "connected" | "disconnected";

interface SocialAccount {
  id: number;
  platform: Platform;
  handle: string;
  status: Status;
  autoPost: boolean;
}

const PLATFORM_META: Record<Platform, { label: string; color: string; icon: string }> = {
  instagram: { label: "Instagram", color: "#E1306C", icon: "I" },
  x:         { label: "X (Twitter)", color: "#1DA1F2", icon: "X" },
  linkedin:  { label: "LinkedIn", color: "#0A66C2", icon: "L" },
  tiktok:    { label: "TikTok", color: "#000000", icon: "T" },
  youtube:   { label: "YouTube", color: "#FF0000", icon: "Y" },
  facebook:  { label: "Facebook", color: "#1877F2", icon: "F" },
};

const INITIAL_ACCOUNTS: SocialAccount[] = [
  { id: 1, platform: "instagram", handle: "@iconoff.studio", status: "connected", autoPost: true },
  { id: 2, platform: "facebook",  handle: "ICONOFF Studio",  status: "connected", autoPost: false },
  { id: 3, platform: "linkedin",  handle: "ICONOFF",         status: "disconnected", autoPost: false },
  { id: 4, platform: "tiktok",    handle: "@iconoff",        status: "disconnected", autoPost: false },
  { id: 5, platform: "youtube",   handle: "ICONOFF Channel", status: "connected", autoPost: true },
  { id: 6, platform: "x",         handle: "@iconoff_studio", status: "disconnected", autoPost: false },
];

export default function SocialAccountsSettings() {
  const [accounts, setAccounts] = useState<SocialAccount[]>(INITIAL_ACCOUNTS);

  function toggleAutoPost(id: number) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, autoPost: !a.autoPost } : a))
    );
  }

  function connect(id: number) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "connected" as Status } : a))
    );
    toast.success("Account connesso");
  }

  function disconnect(id: number) {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "disconnected" as Status, autoPost: false } : a))
    );
    toast.success("Account disconnesso");
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Share2}
        title="Account Social"
        description="Gestisci i tuoi account collegati"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {accounts.map((acc) => {
          const meta = PLATFORM_META[acc.platform];
          const isConnected = acc.status === "connected";
          return (
            <SettingsCard key={acc.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: meta.color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0,
                  fontFamily: "var(--font-display)",
                }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                    color: "var(--text-primary)",
                  }}>
                    {meta.label}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    color: "var(--text-tertiary)", marginTop: 1,
                  }}>
                    {acc.handle}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isConnected ? "var(--color-success)" : "var(--text-tertiary)",
                }} />
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 12,
                  color: isConnected ? "var(--color-success)" : "var(--text-tertiary)",
                  fontWeight: 500,
                }}>
                  {isConnected ? "Connesso" : "Non collegato"}
                </span>
              </div>

              {/* Auto-post toggle */}
              {isConnected && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 12, padding: "8px 0",
                  borderTop: "1px solid var(--border-glass)",
                }}>
                  <span style={{
                    fontFamily: "var(--font-body)", fontSize: 12,
                    color: "var(--text-secondary)",
                  }}>
                    Auto-post
                  </span>
                  <SettingsToggle
                    checked={acc.autoPost}
                    onChange={() => toggleAutoPost(acc.id)}
                  />
                </div>
              )}

              {/* Connect / Disconnect button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {isConnected ? (
                  <button
                    onClick={() => disconnect(acc.id)}
                    style={{
                      background: "none", border: "1px solid var(--color-error)",
                      borderRadius: "var(--radius-md)", padding: "6px 14px",
                      fontSize: 12, fontWeight: 500, color: "var(--color-error)",
                      cursor: "pointer", fontFamily: "var(--font-body)",
                    }}
                  >
                    Disconnetti
                  </button>
                ) : (
                  <button
                    onClick={() => connect(acc.id)}
                    className="btn-primary"
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 12, padding: "6px 14px",
                    }}
                  >
                    <RefreshCw style={{ width: 12, height: 12 }} />
                    Connetti
                  </button>
                )}
              </div>
            </SettingsCard>
          );
        })}
      </div>
    </div>
  );
}
