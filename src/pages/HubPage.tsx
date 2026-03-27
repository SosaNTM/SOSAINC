import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, userCanAccessPortal } from "@/lib/authContext";
import { usePortal, PORTALS, getLastAccessed, type PortalConfig } from "@/lib/portalContext";
import { formatDistanceToNow } from "date-fns";
import s from "./HubPage.module.css";

/* ── Portal visual config ─────────────────────────────────── */

const PORTAL_META: Record<string, { icon: string; color: string; desc: string }> = {
  sosa:    { icon: "▣", color: "#4488ff", desc: "Corporate management & operations" },
  keylo:   { icon: "⚷", color: "#00ff88", desc: "Access control & security hub" },
  redx:    { icon: "⚡", color: "#ff4444", desc: "Performance & growth operations" },
  trustme: { icon: "◈", color: "#ff6b00", desc: "Compliance, legal & trust layer" },
};

/* ── HubPage ──────────────────────────────────────────────── */

export default function HubPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setPortal } = usePortal();
  const [loaded, setLoaded] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredEnter, setHoveredEnter] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const accessiblePortals = PORTALS.filter((p) => userCanAccessPortal(user, p.id));

  const handleSelectPortal = (portal: PortalConfig): void => {
    setPortal(portal);
    navigate(`${portal.routePrefix}/dashboard`);
  };

  const handleLogout = (): void => {
    logout();
    navigate("/login");
  };

  return (
    <div className={s.wrapper}>
      {/* Background lines */}
      <div className={s.bgLine1} />
      <div className={s.bgLine2} />
      <div className={s.bgLine3} />
      <div className={s.scanline} />

      {/* Corner accents */}
      <div className={s.cornerTL} />
      <div className={s.cornerTR} />
      <div className={s.cornerBL} />
      <div className={s.cornerBR} />

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div
        className={`${s.header} ${loaded ? s.animFadeInUp : ""}`}
        style={loaded ? { animationDelay: "0.1s" } : { opacity: 0 }}
      >
        <h1 className={s.logo}>SOSA INC.</h1>
        <p className={s.subtitle}>Select your workspace</p>
      </div>

      {/* ── PORTAL ROW — 4 columns ─────────────────────────────── */}
      <div className={s.portalRow}>
        {accessiblePortals.map((portal, i) => {
          const meta = PORTAL_META[portal.id] ?? { icon: "◻", color: portal.accent, desc: portal.subtitle };
          const lastAccessed = getLastAccessed(portal.id);
          let lastAccessedText = "Not yet accessed";
          if (lastAccessed) {
            try { lastAccessedText = formatDistanceToNow(new Date(lastAccessed), { addSuffix: false }); }
            catch { lastAccessedText = "Recently"; }
          }
          const isHovered = hoveredCard === portal.id;
          const isEnterHovered = hoveredEnter === portal.id;

          return (
            <div
              key={portal.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectPortal(portal)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectPortal(portal); } }}
              onMouseEnter={() => setHoveredCard(portal.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`${s.card} ${loaded ? s.animFadeInUp : ""}`}
              style={{
                ...(loaded ? { animationDelay: `${0.25 + i * 0.1}s` } : { opacity: 0 }),
                borderColor: isHovered ? meta.color : "#1a1a1a",
                background: isHovered
                  ? `linear-gradient(180deg, ${meta.color}08, transparent 70%)`
                  : "rgba(255,255,255,0.015)",
              }}
            >
              {/* Top accent line */}
              <div
                className={s.cardAccent}
                style={{ background: `linear-gradient(90deg, ${meta.color}, ${meta.color}33)` }}
              />

              {/* Icon */}
              <div
                className={s.iconBox}
                style={{
                  borderColor: `${meta.color}33`,
                  background: `${meta.color}0d`,
                  color: meta.color,
                }}
              >
                {meta.icon}
              </div>

              {/* Name + desc */}
              <h2 className={s.cardName}>{portal.name}</h2>
              <p className={s.cardDesc}>{meta.desc}</p>

              {/* Spacer */}
              <div className={s.cardSpacer} />

              {/* Status */}
              <div className={s.statusRow}>
                <div className={s.statusDot} style={{ background: meta.color }} />
                <span className={s.statusText}>Active</span>
              </div>

              {/* Enter button — fill on hover */}
              <button
                type="button"
                onMouseEnter={() => setHoveredEnter(portal.id)}
                onMouseLeave={() => setHoveredEnter(null)}
                onClick={(e) => { e.stopPropagation(); handleSelectPortal(portal); }}
                className={s.enterBtn}
                style={{
                  color: isEnterHovered ? "#0a0a0a" : meta.color,
                  background: isEnterHovered ? meta.color : "transparent",
                  borderColor: meta.color,
                }}
                aria-label={`Enter ${portal.name}`}
              >
                Enter →
              </button>

              {/* Last accessed */}
              <span className={s.lastAccessed}>{lastAccessedText}</span>
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      {user && (
        <div
          className={`${s.footer} ${loaded ? s.animFadeIn : ""}`}
          style={loaded ? { animationDelay: "0.8s" } : { opacity: 0 }}
        >
          <div className={s.userRow}>
            <div className={s.userAvatar}>
              {(user.displayName ?? "U").charAt(0).toUpperCase()}
            </div>
            <span className={s.userName}>{user.displayName}</span>
            <span className={s.dividerDot}>•</span>
            <button
              type="button"
              onClick={handleLogout}
              className={s.signOutBtn}
              aria-label="Sign out"
            >
              → Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
