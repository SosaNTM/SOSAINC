import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

// Runs inside the OAuth popup. Exchanges code+state, then postMessages result
// to the opener window and closes itself.

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const platform = searchParams.get("platform") ?? extractPlatformFromState(state);
    const oauthError = searchParams.get("error");
    const oauthErrorDesc = searchParams.get("error_description");

    if (oauthError) {
      const msg = oauthErrorDesc ?? oauthError;
      setStatus("error");
      setMessage(`Connessione negata: ${msg}`);
      notifyOpener({ type: "oauth_error", platform: platform ?? "", error: msg });
      return;
    }

    if (!code || !state) {
      const msg = "Parametri OAuth mancanti";
      setStatus("error");
      setMessage(msg);
      notifyOpener({ type: "oauth_error", platform: platform ?? "", error: msg });
      return;
    }

    async function exchange() {
      try {
        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Sessione scaduta — accedi di nuovo");

        const resp = await fetch(
          `${supabaseUrl}/functions/v1/social-oauth?action=callback&platform=${platform}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ code, state }),
          },
        );

        const result = await resp.json() as { ok?: boolean; error?: string };

        if (!resp.ok || result.error) {
          throw new Error(result.error ?? "Token exchange fallito");
        }

        setStatus("success");
        setMessage("Account collegato");
        notifyOpener({ type: "oauth_success", platform: platform ?? "" });
        setTimeout(() => window.close(), 800);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setMessage(msg);
        notifyOpener({ type: "oauth_error", platform: platform ?? "", error: msg });
      }
    }

    void exchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh",
      background: "#0a0a0a", fontFamily: "var(--font-mono, 'Space Mono', monospace)", gap: 12,
    }}>
      {status === "loading" && (
        <p style={{ color: "var(--sosa-yellow, #d4ff00)", fontSize: 14 }}>Connessione in corso…</p>
      )}
      {status === "success" && (
        <p style={{ color: "#22c55e", fontSize: 14 }}>&#x2713; {message}</p>
      )}
      {status === "error" && (
        <>
          <p style={{ color: "#ef4444", fontSize: 14 }}>&#x2717; {message}</p>
          <button
            onClick={() => window.close()}
            style={{
              marginTop: 16, background: "var(--sosa-yellow, #d4ff00)",
              color: "#000", border: "none", padding: "8px 20px",
              cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: "bold",
            }}
          >
            CHIUDI
          </button>
        </>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type OAuthMessage =
  | { type: "oauth_success"; platform: string }
  | { type: "oauth_error"; platform: string; error: string };

function notifyOpener(msg: OAuthMessage) {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(msg, window.location.origin);
    }
  } catch {
    // Cross-origin opener — ignore
  }
}

// The state payload (base64 JSON) contains the platform if the URL doesn't have it.
function extractPlatformFromState(state: string | null): string | null {
  if (!state) return null;
  try {
    const dot = state.lastIndexOf(".");
    const encoded = dot !== -1 ? state.slice(0, dot) : state;
    const payload = JSON.parse(atob(encoded)) as { platform?: string };
    return payload.platform ?? null;
  } catch {
    return null;
  }
}
