import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { toast } from "sonner";
import s from "./LoginPage.module.css";

/* ── Luxury product data — bags only ─────────────────────────── */
const PRODUCTS = [
  // Column 1 — 6 items
  { bg: "#1a2838", img: "/images/products/p1.png",  name: "Hermès Birkin 35",         price: "$38,500" },
  { bg: "#2a2218", img: "/images/products/p3.png",  name: "Louis Vuitton Neverfull",  price: "$2,030" },
  { bg: "#2a1a18", img: "/images/products/p4.png",  name: "Chanel Classic Flap",      price: "$10,800" },
  { bg: "#2a1820", img: "/images/products/p6.png",  name: "Gucci GG Marmont",         price: "$2,980" },
  { bg: "#1a1a20", img: "/images/products/p7.png",  name: "Dior Book Tote",           price: "$3,350" },
  { bg: "#182a20", img: "/images/products/p9.png",  name: "Hermès Birkin Croc",       price: "$42,000" },
  // Column 2 — 5 items
  { bg: "#1a1a28", img: "/images/products/p11.png", name: "Chanel Classic Navy",      price: "$10,800" },
  { bg: "#0a2a1a", img: "/images/products/p13.png", name: "Bulgari Serpenti",         price: "$3,850" },
  { bg: "#2a2218", img: "/images/products/p14.png", name: "Louis Vuitton Flower",     price: "$3,450" },
  { bg: "#1a1a1a", img: "/images/products/p15.png", name: "Balenciaga City",          price: "$2,390" },
  { bg: "#2a1820", img: "/images/products/p17.png", name: "Hermès Birkin Bordeaux",   price: "$45,000" },
  // Column 3 — 5 items
  { bg: "#1a2030", img: "/images/products/p19.png", name: "Chanel Classic Blue",      price: "$10,800" },
  { bg: "#2a1018", img: "/images/products/p20.png", name: "Prada Promenade",          price: "$3,200" },
  { bg: "#1a1a1a", img: "/images/products/p21.png", name: "Hermès Kelly 32",          price: "$28,500" },
  { bg: "#2a2218", img: "/images/products/p22.png", name: "Gucci Horsebit Boston",    price: "$2,890" },
  { bg: "#2a1820", img: "/images/products/p23.png", name: "Miu Miu Arcadie",          price: "$2,650" },
];

/* Build 3 columns, doubled for seamless loop */
const COLUMNS = [
  PRODUCTS.slice(0, 6),
  PRODUCTS.slice(6, 11),
  PRODUCTS.slice(11, 16),
];

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  if (isAuthenticated) return <Navigate to="/hub" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email is required";
    if (!password)     next.password = "Password is required";
    if (Object.keys(next).length) { setErrors(next); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(email, password, false);
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.root}>

      {/* ── Left panel: scrolling product grid ───────────────── */}
      <div className={s.left}>
        <div className={s.grid}>
          {COLUMNS.map((col, ci) => (
            <div
              key={ci}
              className={`${s.column} ${ci === 1 ? s.columnSlow : ""}`}
            >
              <div className={s.columnInner}>
                {/* Render cards twice for seamless infinite scroll */}
                {[...col, ...col].map((p, i) => (
                  <div key={i} className={s.card} style={{ background: p.bg }}>
                    <img
                      src={p.img}
                      alt={p.name}
                      className={s.cardImg}
                      loading="lazy"
                    />
                    <div className={s.cardInfo}>
                      <span className={s.cardName}>{p.name}</span>
                      <span className={s.cardPrice}>{p.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Gradient fades top & bottom */}
        <div className={s.fadeTop} />
        <div className={s.fadeBottom} />
      </div>

      {/* ── Right panel: login form ───────────────────────────── */}
      <div className={s.right}>
        <div className={s.glow} />

        <div className={s.formWrap}>
          <p className={`${s.welcome} ${s.a1}`}>Welcome back to</p>
          <p className={`${s.brand}   ${s.a2}`}>ICONOFF</p>
          <p className={`${s.subtitle} ${s.a3}`}>LOGIN TO YOUR PERSONAL TOOL</p>

          <div className={`${s.divider} ${s.a4}`} />

          <form onSubmit={handleSubmit} noValidate className={`${s.form} ${s.a5}`}>
            <div className={s.fieldGroup}>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(p => ({ ...p, email: undefined }));
                }}
                className={s.input}
                placeholder="Email Address"
                autoComplete="email"
              />
              {errors.email && <p className={s.fieldError}>{errors.email}</p>}
            </div>

            <div className={`${s.fieldGroup} ${s.mt12}`}>
              <div className={s.passwordWrap}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(p => ({ ...p, password: undefined }));
                  }}
                  className={s.input}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button type="button"
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className={s.toggle}
                >
                  {showPwd ? "HIDE" : "SHOW"}
                </button>
              </div>
              {errors.password && <p className={s.fieldError}>{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className={s.submitBtn}>
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>

          <Link to="/forgot-password" className={`${s.forgotLink} ${s.a6}`}>
            Forget Password?
          </Link>

        </div>
      </div>

    </div>
  );
};

export default LoginPage;
