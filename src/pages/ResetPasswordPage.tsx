import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { MorphingSquare } from "@/components/ui/morphing-square";
import { toast } from "sonner";

function getStrength(pw: string): { label: string; percent: number; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", percent: 25, color: "#ef4444" };
  if (score <= 3) return { label: "Medium", percent: 55, color: "#f59e0b" };
  return { label: "Strong", percent: 100, color: "#22c55e" };
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getStrength(password);
  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setDone(true);
    toast.success("Password reset successfully");
    setTimeout(() => navigate("/login"), 2000);
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>ICONOFF</h1>
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
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                <CheckCircle className="w-6 h-6" style={{ color: "#22c55e" }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Password reset!</h2>
              <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>Redirecting to login…</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Reset password</h2>
              <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 28 }}>Choose a new password for your account</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input w-full"
                      style={{ padding: "10px 42px 10px 14px", fontSize: 14 }}
                    />
                    <button type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--glass-border)" }}>
                        <div style={{ width: `${strength.percent}%`, height: "100%", borderRadius: 2, background: strength.color, transition: "all 0.3s ease" }} />
                      </div>
                      <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>Confirm password</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="glass-input w-full"
                    style={{ padding: "10px 14px", fontSize: 14 }}
                  />
                  {mismatch && (
                    <p style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>Passwords don't match</p>
                  )}
                </div>

                <button type="submit"
                  disabled={loading || mismatch || password.length < 6}
                  className="glass-btn-primary flex items-center justify-center gap-2"
                  style={{ padding: "12px 0", fontSize: 14, fontWeight: 600, borderRadius: 10, width: "100%", opacity: mismatch ? 0.5 : 1 }}
                >
                  {loading && <MorphingSquare size={16} className="bg-white" />}
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </form>

              <Link to="/login" className="block mt-6" style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
                ← Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
