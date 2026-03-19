import { useNavigate } from "react-router-dom";
import { useAuth, userCanAccessPortal } from "@/lib/authContext";
import { usePortal, PORTALS, getLastAccessed, type PortalConfig } from "@/lib/portalContext";
import { UserAvatar } from "@/components/UserAvatar";
import { Building2, KeyRound, Zap, ShieldCheck, ArrowRight, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  KeyRound,
  Zap,
  ShieldCheck,
};

export default function HubPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setPortal } = usePortal();

  const accessiblePortals = PORTALS.filter(p => userCanAccessPortal(user, p.id));

  const handleSelectPortal = (portal: PortalConfig) => {
    setPortal(portal);
    navigate(`${portal.routePrefix}/dashboard`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4">
      {/* Background */}
      <div className="ambient-orbs">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <div className="ambient-orb-3" />
        <div className="ambient-orb-4" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-[920px] mx-auto">
        {/* Logo + tagline */}
        <div className="text-center">
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: "0.35em",
              lineHeight: 1.2,
            }}
          >
            S O S A
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-tertiary)",
              marginTop: 8,
              fontWeight: 500,
            }}
          >
            Select your workspace
          </p>
        </div>

        {/* Portal cards grid */}
        <div
          className="grid w-full gap-5"
          style={{
            gridTemplateColumns: "repeat(2, 1fr)",
          }}
        >
          {accessiblePortals.map((portal) => {
            const Icon = ICON_MAP[portal.icon];
            const lastAccessed = getLastAccessed(portal.id);
            const lastAccessedText = lastAccessed
              ? `Last accessed ${formatDistanceToNow(new Date(lastAccessed), { addSuffix: true })}`
              : "Not yet accessed";

            return (
              <button type="button"
                key={portal.id}
                onClick={() => handleSelectPortal(portal)}
                className="group text-left transition-all duration-250"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid var(--glass-border)",
                  borderLeft: `4px solid ${portal.accent}`,
                  borderRadius: 20,
                  padding: "32px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "var(--glass-bg-hover)";
                  el.style.borderColor = `${portal.accent}80`;
                  el.style.borderLeftColor = portal.accent;
                  el.style.boxShadow = `0 8px 40px ${portal.accent}2E`;
                  el.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "var(--glass-bg)";
                  el.style.borderColor = "var(--glass-border)";
                  el.style.borderLeftColor = portal.accent;
                  el.style.boxShadow = "none";
                  el.style.transform = "translateY(0)";
                }}
              >
                {/* Icon */}
                <div
                  className="flex items-center justify-center mb-4"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `${portal.accent}18`,
                  }}
                >
                  {Icon && (
                    <Icon
                      style={{
                        width: 26,
                        height: 26,
                        color: portal.accent,
                        strokeWidth: 1.8,
                      }}
                    />
                  )}
                </div>

                {/* Name */}
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {portal.name}
                </h2>

                {/* Subtitle */}
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-tertiary)",
                    marginBottom: 16,
                  }}
                >
                  {portal.subtitle}
                </p>

                {/* Divider */}
                <div
                  style={{
                    height: 1,
                    background: "var(--divider)",
                    marginBottom: 14,
                  }}
                />

                {/* Bottom row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: portal.accent,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Active
                    </span>
                  </div>
                  <span
                    className="flex items-center gap-1 group-hover:gap-2 transition-all"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: portal.accent,
                    }}
                  >
                    Enter <ArrowRight style={{ width: 14, height: 14 }} />
                  </span>
                </div>

                {/* Last accessed */}
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--text-quaternary)",
                    marginTop: 8,
                  }}
                >
                  {lastAccessedText}
                </p>
              </button>
            );
          })}
        </div>

        {/* Responsive: on mobile make single column */}
        <style>{`
          @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr !important; max-width: 400px; margin: 0 auto; }
          }
        `}</style>

        {/* User indicator */}
        {user && (
          <div
            className="flex items-center gap-3"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid var(--glass-border)",
              borderRadius: 40,
              padding: "8px 20px 8px 8px",
            }}
          >
            <UserAvatar user={user} size={32} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {user.displayName}
            </span>
            <button type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 transition-colors"
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginLeft: 8,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#FF5A5A")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
