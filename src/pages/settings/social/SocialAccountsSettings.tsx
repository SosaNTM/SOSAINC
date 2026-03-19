import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, RefreshCw, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";
const SUCCESS = "#4ADE80";
const WARNING = "#FBBF24";

type Platform = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "x";
type Status = "connected" | "disconnected" | "expired";

const PLATFORM_COLORS: Record<Platform, string> = {
  instagram: "#E1306C",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  tiktok: "#000000",
  youtube: "#FF0000",
  x: "#1DA1F2",
};

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X (Twitter)",
};

const STATUS_COLORS: Record<Status, string> = {
  connected: SUCCESS,
  disconnected: TEXT_MUTED,
  expired: WARNING,
};

const STATUS_LABELS: Record<Status, string> = {
  connected: "Connesso",
  disconnected: "Disconnesso",
  expired: "Scaduto",
};

interface SocialAccount {
  id: number;
  platform: Platform;
  accountName: string;
  status: Status;
  lastSync: string;
  followers: string;
}

// TODO: wire to social_connections table
const DEFAULT_ACCOUNTS: SocialAccount[] = [
  { id: 1, platform: "instagram", accountName: "@iconoff.studio", status: "connected",    lastSync: "5 min fa",  followers: "12.4K" },
  { id: 2, platform: "facebook",  accountName: "ICONOFF Studio",  status: "connected",    lastSync: "1 ora fa",  followers: "8.2K"  },
  { id: 3, platform: "linkedin",  accountName: "ICONOFF",         status: "expired",      lastSync: "3 gg fa",   followers: "3.1K"  },
  { id: 4, platform: "tiktok",    accountName: "@iconoff",        status: "disconnected", lastSync: "—",         followers: "—"     },
  { id: 5, platform: "youtube",   accountName: "ICONOFF Channel", status: "connected",    lastSync: "2 ore fa",  followers: "5.7K"  },
  { id: 6, platform: "x",         accountName: "@iconoff_studio", status: "disconnected", lastSync: "—",         followers: "—"     },
];

const ALL_PLATFORMS: Platform[] = ["instagram","facebook","linkedin","tiktok","youtube","x"];

export default function SocialAccountsSettings() {
  const [accounts, setAccounts] = useState<SocialAccount[]>(DEFAULT_ACCOUNTS);

  function reconnect(id: number) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: "connected", lastSync: "Adesso" } : a));
    toast({ title: "Account riconnesso" });
  }

  function disconnect(id: number) {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: "disconnected", lastSync: "—", followers: "—" } : a));
    toast({ title: "Account disconnesso" });
  }

  function connectNew(platform: Platform) {
    const existing = accounts.find(a => a.platform === platform && a.status === "connected");
    if (existing) return;
    toast({ title: `Connessione a ${PLATFORM_LABELS[platform]}…`, description: "OAuth simulato — nessuna richiesta reale." });
  }

  const connectedPlatforms = new Set(accounts.filter(a => a.status === "connected").map(a => a.platform));

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Account Collegati
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Gestisci i profili social connessi alla piattaforma
        </p>
      </div>

      {/* Accounts list */}
      <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "18px 22px", marginBottom: 24 }}>
        <AnimatePresence initial={false}>
          {accounts.map((acc, idx) => {
            const pColor = PLATFORM_COLORS[acc.platform];
            const initial = PLATFORM_LABELS[acc.platform][0].toUpperCase();
            const sColor = STATUS_COLORS[acc.status];
            return (
              <motion.div
                key={acc.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0",
                  borderBottom: idx < accounts.length - 1 ? `0.5px solid ${BORDER}` : "none",
                }}
              >
                {/* Platform circle */}
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: pColor, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
                }}>
                  {initial}
                </div>

                {/* Left info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{acc.accountName}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>{PLATFORM_LABELS[acc.platform]}</div>
                </div>

                {/* Middle info */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0, minWidth: 130 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: sColor,
                    background: `${sColor}1a`, borderRadius: 4, padding: "2px 8px",
                    border: `0.5px solid ${sColor}40`,
                  }}>{STATUS_LABELS[acc.status]}</span>
                  <div style={{ fontSize: 10, color: TEXT_MUTED }}>Sync: {acc.lastSync}</div>
                  {acc.followers !== "—" && (
                    <div style={{ fontSize: 10, color: TEXT_SECONDARY }}>{acc.followers} follower</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {(acc.status === "disconnected" || acc.status === "expired") && (
                    <button type="button" className="glass-btn" onClick={() => reconnect(acc.id)} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <RefreshCw size={12} /> Riconnetti
                    </button>
                  )}
                  {acc.status === "connected" && (
                    <button type="button"
                      onClick={() => disconnect(acc.id)}
                      style={{ fontSize: 11, color: "#EF4444", background: "transparent", border: "none", cursor: "pointer", padding: "2px 4px" }}
                    >
                      Disconnetti
                    </button>
                  )}
                  <button type="button" style={{ ...iconBtnStyle(TEXT_MUTED) }} title="Impostazioni">
                    <Settings size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Connect new section */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 14, marginTop: 0 }}>
          Collega Nuovo Account
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {ALL_PLATFORMS.map(platform => {
            const pColor = PLATFORM_COLORS[platform];
            const isConnected = connectedPlatforms.has(platform);
            return (
              <div
                key={platform}
                style={{
                  background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 10,
                  padding: "14px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: pColor, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: "#fff",
                }}>
                  {PLATFORM_LABELS[platform][0]}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: TEXT_PRIMARY }}>{PLATFORM_LABELS[platform]}</span>
                {isConnected ? (
                  <span style={{ fontSize: 10, color: SUCCESS, display: "flex", alignItems: "center", gap: 3 }}>
                    Connesso ✓
                  </span>
                ) : (
                  <button type="button"
                    className="glass-btn"
                    onClick={() => connectNew(platform)}
                    style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px" }}
                  >
                    <Plus size={11} /> Connetti
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 6, border: "none",
    background: "transparent", color, cursor: "pointer",
  };
}
