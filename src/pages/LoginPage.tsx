import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import s from "./LoginPage.module.css";

/* ── Data ─────────────────────────────────────────────────── */

const QUOTES = [
  { text: "DREAM BIG.", delay: 0 },
  { text: "WORK HARD.", delay: 0.3 },
  { text: "STAY HUMBLE.", delay: 0.6 },
];

const BOTTOM_QUOTES = [
  "GRIND IN SILENCE.",
  "LET SUCCESS MAKE THE NOISE.",
  "NOBODY CARES. WORK HARDER.",
  "STAY HUNGRY. STAY FOOLISH.",
  "LEVELS TO THIS.",
];

/* ── Logo SVG ─────────────────────────────────────────────── */

function LogoMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" stroke="#e8ff00" strokeWidth="2" />
      <rect x="8" y="8" width="32" height="32" stroke="#e8ff00" strokeWidth="1" opacity="0.4" />
      <text x="24" y="29" textAnchor="middle" fill="#e8ff00" fontFamily="Bebas Neue" fontSize="18" letterSpacing="2">S</text>
    </svg>
  );
}

/* ── Main LoginPage ──────────────────────────────────────── */

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState(0);
  const [loaded, setLoaded]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [shaking, setShaking]         = useState(false);
  const [success, setSuccess]         = useState(false);

  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Boot sequence ──────────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    const interval = setInterval(() => {
      setCurrentQuote((p) => (p + 1) % BOTTOM_QUOTES.length);
    }, 3500);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, []);

  /* ── Canvas grain ───────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 600;
    canvas.height = 900;
    const imageData = ctx.createImageData(600, 900);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.random() * 255;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 18;
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  /* ── Cleanup shake timer ────────────────────────────────── */
  useEffect(() => {
    return () => { if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current); };
  }, []);

  /* ── Navigate after success fade-out (300ms animation) ── */
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate("/hub", { replace: true }), 350);
    return () => clearTimeout(t);
  }, [success, navigate]);

  /* ── Form submit ────────────────────────────────────────── */
  const handleSubmit = useCallback((e?: React.FormEvent): void => {
    e?.preventDefault?.();
    const errs: typeof fieldErrors = {};
    if (!email.trim()) errs.email = "EMAIL REQUIRED";
    if (!password)     errs.password = "PASSWORD REQUIRED";
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setError(null);
    setLoading(true);

    void (async () => {
      try {
        await login(email, password, false);
        setSuccess(true);
      } catch (err: unknown) {
        const isNetworkError = err instanceof TypeError && err.message.toLowerCase().includes("network");
        const message = isNetworkError
          ? "CONNECTION ERROR. PLEASE TRY AGAIN."
          : err instanceof Error ? err.message : "INVALID CREDENTIALS";
        setError(message);
        setShaking(true);
        shakeTimerRef.current = setTimeout(() => setShaking(false), 400);
        setLoading(false);
      }
    })();
  }, [email, password, login]);

  /* ── Auth redirect (AFTER all hooks) ────────────────────── */
  if (isAuthenticated && !success) return <Navigate to="/hub" replace />;

  return (
    <div className={`${s.wrapper} ${success ? s.successOut : ""}`}>

      {/* ══ LEFT PANEL — THE WALL ═══════════════════════════════ */}
      <div className={s.leftPanel}>
        <canvas ref={canvasRef} className={s.grainCanvas} />
        <div className={s.scanline} />

        {/* Diagonal accent lines */}
        <div className={s.diagonalLine1} />
        <div className={s.diagonalLine2} />

        {/* Top branding */}
        <div
          className={s.topBrand}
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(-20px)",
          }}
        >
          <div className={s.brandDot} />
          <span className={s.brandText}>SOSA INC.</span>
        </div>

        {/* Main quotes */}
        <div className={s.quotesContainer}>
          {QUOTES.map((q, i) => (
            <div
              key={i}
              className={`${s.quoteMain} ${loaded ? s.slideUpAnim : ""}`}
              style={loaded ? { animationDelay: `${q.delay}s` } : undefined}
            >
              <span className={s.quoteText}>{q.text}</span>
            </div>
          ))}

          {/* Accent line */}
          <div className={`${s.accentLine} ${loaded ? s.lineExpandAnim : ""}`} />

          {/* Rotating sub-quote */}
          <div className={s.subQuoteContainer}>
            <p key={currentQuote} className={`${s.subQuote} ${s.quoteSwapAnim}`}>
              {BOTTOM_QUOTES[currentQuote]}
            </p>
          </div>
        </div>

        {/* Bottom decorations */}
        <div className={s.bottomDecor} style={{ opacity: loaded ? 1 : 0 }}>
          <div className={s.hashTags}>
            <span className={s.hashTag}>#NOSLEEP</span>
            <span className={s.hashDivider}>×</span>
            <span className={s.hashTag}>#NOEXCUSES</span>
            <span className={s.hashDivider}>×</span>
            <span className={s.hashTag}>#HUSTLE</span>
          </div>
          <div className={s.yearMark}>© 2026</div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — LOGIN ═════════════════════════════════ */}
      <div className={s.rightPanel}>
        {/* Corner accents */}
        <div className={s.cornerTL} />
        <div className={s.cornerBR} />

        <div
          className={s.loginContainer}
          style={{
            opacity: loaded ? 1 : 0,
            transform: loaded ? "translateY(0)" : "translateY(30px)",
          }}
        >
          <h1 className={s.loginTitle}>SIGN IN</h1>
          <p className={s.loginSubtitle}>ENTER THE GRIND</p>

          {/* Error banner */}
          {error && (
            <div className={s.errorBanner} role="alert" aria-live="polite">
              <AlertCircle aria-hidden={true} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className={shaking ? s.shake : undefined}
          >
            {/* Email */}
            <div className={s.fieldGroup}>
              <label htmlFor="login-email" className={s.fieldLabel}>EMAIL</label>
              <div className={s.inputWrapper} data-focused={focusedField === "email" ? "true" : undefined}>
                <span className={s.inputIcon} aria-hidden="true">→</span>
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="YOUR@EMAIL.COM"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                  }}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  className={s.input}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className={s.fieldError} role="alert">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className={s.fieldGroup} style={{ marginTop: 16 }}>
              <label htmlFor="login-password" className={s.fieldLabel}>PASSWORD</label>
              <div className={s.inputWrapper} data-focused={focusedField === "password" ? "true" : undefined}>
                <span className={s.inputIcon} aria-hidden="true">◆</span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  className={s.input}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className={s.togglePw}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className={s.fieldError} role="alert">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className={s.submitBtn}>
              {loading ? (
                <span className={s.loadingDots}><span /><span /><span /></span>
              ) : (
                <>
                  <span className={s.btnText}>LET&apos;S WORK</span>
                  <span className={s.btnArrow}>↗</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Status bar */}
        <div className={s.statusBar} style={{ opacity: loaded ? 1 : 0 }}>
          <div className={s.statusDot} />
          <span className={s.statusText}>SYSTEM ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
