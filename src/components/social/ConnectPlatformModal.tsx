import { useState, useRef, useEffect } from "react";
import { X, Check, XCircle, Zap } from "lucide-react";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { toast } from "@/hooks/use-toast";

export interface PlatformDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

interface ConnectPlatformModalProps {
  platform: PlatformDef;
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

// Platforms that have OAuth credentials wired up in the edge function
const OAUTH_SUPPORTED_PLATFORMS = new Set([
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "twitter",
]);

export function ConnectPlatformModal({ platform, onClose, onConnected }: ConnectPlatformModalProps) {
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleConnect() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 2000));
    setLoading(false);
    onConnected(platform.id);
    onClose();
  }

  async function handleOAuthConnect() {
    setOauthLoading(true);
    try {
      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
      const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";

      // Request the OAuth authorization URL from the edge function
      const resp = await fetch(
        `${supabaseUrl}/functions/v1/social-oauth?action=auth_url&platform=${platform.id}`,
        { headers: { apikey: anonKey } },
      );

      const result = (await resp.json()) as { auth_url?: string; error?: string };

      if (!resp.ok || result.error) {
        toast({
          title: "Not configured",
          description: result.error ?? "Could not get authorization URL",
          variant: "destructive",
        });
        setOauthLoading(false);
        return;
      }

      // Open the OAuth flow in a popup window
      const popup = window.open(
        result.auth_url,
        "oauth_connect",
        "width=600,height=700,scrollbars=yes,resizable=yes",
      );

      if (!popup) {
        toast({
          title: "Popup blocked",
          description: "Please allow popups for this site, then try again.",
          variant: "destructive",
        });
        setOauthLoading(false);
        return;
      }

      // Poll until the popup is closed, then treat as connected
      pollRef.current = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollRef.current);
          setOauthLoading(false);
          onConnected(platform.id);
          onClose();
        }
      }, 500);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      setOauthLoading(false);
    }
  }

  const isOAuthSupported = OAUTH_SUPPORTED_PLATFORMS.has(platform.id);
  const anyLoading = loading || oauthLoading;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: "min(480px, calc(100% - 2rem))", background: "var(--sosa-bg-3)", border: "1px solid var(--sosa-border)", borderLeft: `3px solid ${platform.color}`, borderRadius: 0, overflow: "hidden" }}>

        {/* Branded header */}
        <div style={{
          padding: "24px 24px 20px",
          borderBottom: "1px solid var(--sosa-border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 54, height: 54,
                background: "var(--sosa-bg-2)",
                border: `1px solid ${platform.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: platform.color, letterSpacing: "0.06em",
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
            <button type="button"
              onClick={onClose}
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
            Connect your {platform.name} Business or Creator account to start tracking followers, engagement, and post performance in real time.
          </p>

          {/* What we'll access */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
              What we'll access
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
          <div style={{
            marginBottom: 26,
            background: "rgba(239,68,68,0.04)",
            border: "1px solid rgba(239,68,68,0.1)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "rgba(239,68,68,0.5)", marginBottom: 10 }}>
              We will NEVER
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

          {/* OAuth connect button (shown for supported platforms) */}
          {isOAuthSupported && (
            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={anyLoading}
              style={{
                width: "100%",
                padding: "14px 20px",
                background: "var(--sosa-yellow)",
                border: "none",
                color: "#000",
                fontSize: 14,
                fontWeight: 700,
                cursor: anyLoading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.08em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: oauthLoading ? 0.6 : 1,
                marginBottom: 10,
              }}
            >
              {oauthLoading ? (
                <>
                  <MorphingSquare size={16} className="bg-white" />
                  Opening OAuth…
                </>
              ) : (
                <>
                  <Zap style={{ width: 15, height: 15 }} />
                  {`Connect with ${platform.name} →`}
                </>
              )}
            </button>
          )}

          {/* Manual / demo connect button */}
          <button type="button"
            onClick={handleConnect}
            disabled={anyLoading}
            style={{
              width: "100%",
              padding: isOAuthSupported ? "10px 20px" : "14px 20px",
              background: isOAuthSupported ? "var(--sosa-bg-2)" : "var(--sosa-yellow)",
              border: isOAuthSupported ? "1px solid var(--sosa-border)" : "none",
              color: isOAuthSupported ? "var(--sosa-white-40)" : "#000",
              fontSize: isOAuthSupported ? 12 : 14,
              fontWeight: 600,
              cursor: anyLoading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-mono)", letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: anyLoading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <>
                <MorphingSquare size={16} className={isOAuthSupported ? "bg-white/40" : "bg-white"} />
                Connecting…
              </>
            ) : (
              isOAuthSupported ? "Add manually instead" : `Connect with ${platform.name} →`
            )}
          </button>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 12 }}>
            By connecting you agree to our data policy.
          </p>
        </div>
      </div>
    </div>
  );
}
