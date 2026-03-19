import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Lock,
  Cloud,
  CheckSquare,
  StickyNote,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { usePermission } from "@/lib/permissions";

const sections = [
  {
    title: "Finance",
    description: "Revenue, costs, invoices & P&L",
    icon: Wallet,
    path: "/dashboard",
    color: "rgba(110, 231, 183, 0.15)",
    iconColor: "#6ee7b7",
  },
  {
    title: "Vault",
    description: "Secure document storage",
    icon: Lock,
    path: "/vault",
    color: "rgba(251, 191, 36, 0.15)",
    iconColor: "#fbbf24",
  },
  {
    title: "Cloud",
    description: "File storage & team documents",
    icon: Cloud,
    path: "/cloud",
    color: "rgba(96, 165, 250, 0.15)",
    iconColor: "#60a5fa",
  },
  {
    title: "Tasks",
    description: "Task management & tracking",
    icon: CheckSquare,
    path: "/tasks",
    color: "rgba(167, 139, 250, 0.15)",
    iconColor: "#a78bfa",
  },
  {
    title: "Notes",
    description: "Quick notes & documentation",
    icon: StickyNote,
    path: "/notes",
    color: "rgba(251, 146, 60, 0.15)",
    iconColor: "#fb923c",
  },
  {
    title: "Administration",
    description: "Users & permissions",
    icon: ShieldCheck,
    path: "/admin",
    color: "rgba(251, 113, 133, 0.15)",
    iconColor: "#fb7185",
    adminOnly: true,
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccessAdmin = usePermission("admin:access");

  const visibleSections = sections.filter(
    (s) => !s.adminOnly || canAccessAdmin
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 16px" }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 4,
        }}
      >
        Welcome back, {user?.displayName || "User"} 👋
      </h1>
      <p
        style={{
          fontSize: 15,
          color: "var(--text-tertiary)",
          marginBottom: 36,
        }}
      >
        What would you like to work on?
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {visibleSections.map((section) => (
          <button type="button"
            key={section.path}
            onClick={() => navigate(section.path)}
            className="text-left transition-all duration-200"
            style={{
              background: "var(--glass-bg)",
              border: "0.5px solid var(--glass-border)",
              borderRadius: "var(--radius-xl, 16px)",
              padding: 28,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "var(--glass-border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: section.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <section.icon
                style={{ width: 24, height: 24, color: section.iconColor, strokeWidth: 1.7 }}
              />
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {section.title}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-tertiary)",
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {section.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
