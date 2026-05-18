import { useState } from "react";
import { Lock } from "lucide-react";
import { verifyPassword } from "@/hooks/settings";

interface Props {
  portalName: string;
  passwordHash: string;
  onUnlocked: () => void;
}

export function PortalLockScreen({ portalName, passwordHash, onUnlocked }: Props) {
  const [value, setValue]     = useState("");
  const [error, setError]     = useState(false);
  const [remember, setRemember] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleUnlock = async () => {
    if (!value) return;
    setChecking(true);
    setError(false);
    if (await verifyPassword(value, passwordHash)) {
      if (remember) sessionStorage.setItem(`portal_unlocked_${portalName}`, "1");
      onUnlocked();
    } else {
      setError(true);
    }
    setChecking(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "var(--sosa-bg, #0a0a0a)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      {/* Dashed border box */}
      <div style={{
        width: "min(860px, 90vw)",
        border: "1px dashed var(--portal-accent, #d4ff00)",
        padding: "60px 40px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
      }}>
        <Lock style={{ width: 48, height: 48, color: "var(--portal-accent, #d4ff00)" }} />

        <div style={{ textAlign: "center" }}>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.14em",
            color: "var(--portal-accent, #d4ff00)", marginBottom: 8,
          }}>
            LOCKED FOLDER
          </p>
          <h2 style={{
            fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700,
            color: "var(--text-primary, #fff)", margin: 0,
          }}>
            Locked Portal
          </h2>
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)",
            marginTop: 10, maxWidth: 380, lineHeight: 1.6,
          }}>
            This portal is protected by a password. Enter the password to view its contents.
          </p>
        </div>

        <div style={{ display: "flex", gap: 0, width: "min(360px, 100%)" }}>
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") void handleUnlock(); }}
            placeholder="Enter password"
            autoFocus
            style={{
              flex: 1,
              fontFamily: "var(--font-mono)", fontSize: 13,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${error ? "var(--color-error)" : "var(--sosa-border, #2a2a2a)"}`,
              borderRight: "none",
              color: "var(--text-primary)",
              padding: "10px 14px",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => void handleUnlock()}
            disabled={checking || !value}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              background: "var(--portal-accent, #d4ff00)", color: "#000",
              border: "none", padding: "10px 18px", cursor: "pointer",
              opacity: checking || !value ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Lock style={{ width: 12, height: 12 }} />
            {checking ? "..." : "Unlock"}
          </button>
        </div>

        {error && (
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--color-error)", marginTop: -8,
          }}>
            Wrong password. Try again.
          </p>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: "var(--portal-accent, #d4ff00)" }}
          />
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11,
            color: "var(--text-tertiary)",
          }}>
            Remember for this session
          </span>
        </label>

        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--text-tertiary)",
        }}>
          Wrong password? Contact the Owner.
        </p>
      </div>
    </div>
  );
}
