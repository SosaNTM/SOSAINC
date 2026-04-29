import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { sendPasswordResetEmail } from "@/lib/supabaseAuth";

const USE_REAL_AUTH = import.meta.env.VITE_USE_REAL_AUTH === "true";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (USE_REAL_AUTH) {
        await sendPasswordResetEmail(email);
      } else {
        await new Promise((r) => setTimeout(r, 1000));
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: "var(--bg-body)" }}>
      <div className="auth-ambient-glow" />
      <div className="ambient-orbs">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <div className="ambient-orb-3" />
        <div className="ambient-orb-4" />
      </div>

      <div className="w-full px-4 relative z-10" style={{ maxWidth: "min(420px, 100%)" }}>
        <div className="text-center mb-8">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>SOSA INC</h1>
          <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginTop: 4 }}>Company Hub</p>
        </div>

        <div
          style={{
            background: "var(--glass-bg)",
            border: "0.5px solid var(--glass-border)",
            borderRadius: "var(--radius-xl, 16px)",
            padding: "clamp(20px, 5vw, 32px)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
          }}
        >
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--accent-color-dim, rgba(110,231,183,0.15))" }}>
                <Mail className="w-6 h-6" style={{ color: "var(--accent-color)" }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Check your email</h2>
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>
                We sent a password reset link to <strong style={{ color: "var(--text-secondary)" }}>{email}</strong>
              </p>
              <Link to="/login" style={{ fontSize: 14, color: "var(--accent-color)", textDecoration: "none", marginTop: 8 }}>
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Forgot password?</h2>
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 28 }}>Enter your email and we'll send you a reset link</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                    className="glass-input"
                    placeholder="you@SOSA INC.com"
                    style={{ padding: "10px 14px", fontSize: 14 }}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }} role="alert">{error}</p>
                )}

                <button type="submit"
                  disabled={loading}
                  className="glass-btn-primary flex items-center justify-center gap-2"
                  style={{ padding: "12px 0", fontSize: 14, fontWeight: 600, borderRadius: 10, width: "100%" }}
                >
                  {loading && <MorphingSquare size={16} className="bg-white" />}
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
              </form>

              <Link to="/login" className="flex items-center gap-1.5 mt-6" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
