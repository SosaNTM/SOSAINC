import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePortal } from "@/lib/portalContext";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { portal } = usePortal();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const platform = searchParams.get("platform");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setStatus("error");
      setMessage(`OAuth denied: ${oauthError}`);
      return;
    }

    if (!code || !platform) {
      setStatus("error");
      setMessage("Missing OAuth parameters");
      return;
    }

    async function exchange() {
      try {
        const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
        const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? "";

        // Exchange the authorization code for tokens via the edge function
        const resp = await fetch(
          `${supabaseUrl}/functions/v1/social-oauth?action=callback&platform=${platform}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": anonKey,
              "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? anonKey}`,
            },
            body: JSON.stringify({
              code,
              portal_id: portal?.id ?? "sosa",
            }),
          },
        );

        const result = (await resp.json()) as { success?: boolean; error?: string };

        if (!resp.ok || result.error) {
          throw new Error(result.error ?? "Token exchange failed");
        }

        setStatus("success");
        setMessage(`${platform} connected successfully!`);

        // Redirect back to accounts page after a short delay
        setTimeout(() => {
          navigate(`/${portal?.id ?? "sosa"}/social/accounts`);
        }, 1500);
      } catch (err: unknown) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : String(err));
      }
    }

    exchange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0a0a",
        fontFamily: "'Space Mono', monospace",
        gap: 12,
      }}
    >
      {status === "loading" && (
        <p style={{ color: "#e8ff00", fontSize: 14 }}>Connecting account...</p>
      )}

      {status === "success" && (
        <>
          <p style={{ color: "#22c55e", fontSize: 14 }}>&#x2713; {message}</p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Redirecting...</p>
        </>
      )}

      {status === "error" && (
        <>
          <p style={{ color: "#ef4444", fontSize: 14 }}>&#x2717; {message}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              marginTop: 16,
              background: "#e8ff00",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            GO BACK
          </button>
        </>
      )}
    </div>
  );
}
