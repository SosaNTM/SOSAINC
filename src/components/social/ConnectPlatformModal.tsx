import { useState, useEffect, useRef } from "react";
import { X, Check, XCircle, Zap } from "lucide-react";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface PlatformDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

interface ConnectPlatformModalProps {
  platform: PlatformDef;
  portalId: string;
  onClose: () => void;
  onConnected: (platformId: string) => void;
}

const ACCESS_LIST = [
  "Profile info (name, avatar, followers)",
  "Post metrics (likes, comments, reach)",
  "Audience demographics",
  "Story and Reel analytics",
];

const WONT_DO_LIST = [
  "Post on your behalf",
  "Access your direct messages",
  "Follow or unfollow accounts",
];

const OAUTH_SUPPORTED_PLATFORMS = new Set([
  "instagram", "facebook", "tiktok", "youtube", "linkedin", "twitter",
]);

export function ConnectPlatformModal({ platform, portalId, onClose, onConnected }: ConnectPlatformModalProps) {
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const popupRef = useRef<Window | null>(null);
  const msgHandlerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (msgHandlerRef.current) window.removeEventListener("message", msgHandlerRef.current);
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
    };
  }, []);

  async function handleOAuthConnect() {
    setErrorMsg("");
    setOauthLoading(true);

    try {
      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessione scaduta — effettua di nuovo il login");

      const resp = await fetch(
        `${supabaseUrl}/functions/v1/social-oauth?action=auth_url&platform=${platform.id}&portal_id=${portalId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = await resp.json() as { auth_url?: string; error?: string };

      if (!resp.ok || result.error) {
        throw new Error(result.error ?? "Impossibile ottenere URL di autorizzazione");
      }

      const popup = window.open(result.auth_url, "oauth_connect", "width=600,height=700,scrollbars=yes,resizable=yes");

      if (!popup) {
        throw new Error("Popup bloccato — abilita i popup per questo sito e riprova");
      }

      popupRef.current = popup;

      // Listen for postMessage from OAuthCallback (runs in popup)
      const handler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        const msg = event.data as { type?: string; platform?: string; error?: string };
        if (msg.type !== "oauth_success" && msg.type !== "oauth_error") return;
        if (msg.platform !== platform.id) return;

        window.removeEventListener("message", handler);
        msgHandlerRef.current = null;
        setOauthLoading(false);

        if (msg.type === "oauth_success") {
          onConnected(platform.id);
          onClose();
        } else {
          setErrorMsg(msg.error ?? "Connessione fallita");
        }
      };

      msgHandlerRef.current = handler;
      window.addEventListener("message", handler);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setOauthLoading(false);
    }
  }

  const isOAuthSupported = OAUTH_SUPPORTED_PLATFORMS.has(platform.id);

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "min(480px, calc(100% - 2rem))", background: "var(--sosa-bg-3)", border: "1px solid var(--sosa-border)", borderLeft: `3px solid ${platform.color}`, borderRadius: 0, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "24px 24px 20px", borderBottom: "1px solid var(--sosa-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 54, height: 54,
                background: "var(--sosa-bg-2)", border: `1px solid ${platform.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                color: platform.color, letterSpacing: "0.06em",
              }}>
                {platform.emoji}
              </div>
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.3px" }}>
                  {platform.name}
                </p>
                <p style={{ fontSize: 12, color: `${platform.color}bb`, marginTop: 2, fontWeight: 500 }}>
                  {platform.description}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              style={{
                width: 32, height: 32,
                background: "var(--sosa-bg-2)", border: "1px solid var(--sosa-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <X style={{ width: 14, height: 14, color: "var(--sosa-white-40)" }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px 24px" }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.65, marginBottom: 22 }}>
            Collega il tuo account {platform.name} Business o Creator per tracciare follower, engagement e performance dei post in tempo reale.
          </p>

          {/* What we'll access */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
              Cosa accediamo
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ACCESS_LIST.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Check style={{ width: 10, height: 10, color: "#10b981" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.58)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What we won't do */}
          <div style={{ marginBottom: 22, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(239,68,68,0.5)", marginBottom: 10 }}>
              Non faremo MAI
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {WONT_DO_LIST.map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <XCircle style={{ width: 10, height: 10, color: "#ef4444" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <p style={{
              fontSize: 12, color: "#ef4444",
              background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.25)",
              padding: "8px 12px", marginBottom: 14,
            }}>
              {errorMsg}
            </p>
          )}

          {/* OAuth connect button */}
          {isOAuthSupported ? (
            <button
              type="button"
              onClick={() => void handleOAuthConnect()}
              disabled={oauthLoading}
              style={{
                width: "100%", padding: "14px 20px",
                background: "var(--sosa-yellow)", border: "none",
                color: "#000", fontSize: 14, fontWeight: 700,
                cursor: oauthLoading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: oauthLoading ? 0.6 : 1,
              }}
            >
              {oauthLoading ? (
                <><MorphingSquare size={16} className="bg-white" /> Autorizzazione…</>
              ) : (
                <><Zap style={{ width: 15, height: 15 }} />{`Collega con ${platform.name} →`}</>
              )}
            </button>
          ) : (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "12px 0" }}>
              {platform.name} non supporta ancora il collegamento automatico.
            </p>
          )}

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 12 }}>
            Collegando accetti la nostra data policy.
          </p>
        </div>
      </div>
    </div>
  );
}
