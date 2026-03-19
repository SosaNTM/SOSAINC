import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { usePermission } from "@/lib/permissions";
import {
  VerticalDock,
  VerticalDockItem,
  VerticalDockLabel,
  VerticalDockIcon,
} from "@/components/ui/dock";
import {
  User,
  Wallet,
  TrendingUp,
  Lock,
  Cloud,
  CheckSquare,
  StickyNote,
  ShieldCheck,
  Settings,
} from "lucide-react";

const financePaths = ["/dashboard", "/costs", "/transactions", "/channels", "/pl-rules", "/invoices"];
const socialPaths  = ["/social/overview", "/social/accounts", "/social/analytics", "/social/content", "/social/audience", "/social/competitors"];
const workspacePaths = ["/vault", "/cloud", "/tasks", "/notes"];

interface DockNavItem {
  label: string;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  path: string;
  matchPaths?: string[];
  permission?: string;
}

const topItems: DockNavItem[] = [
  { label: "Profile", icon: User, path: "/" },
];

const sectionItems: DockNavItem[] = [
  { label: "Finance", icon: Wallet, path: "/dashboard", matchPaths: financePaths, permission: "finance:view" },
  { label: "Social", icon: TrendingUp, path: "/social/overview", matchPaths: socialPaths, permission: "social:view" },
];

const workspaceItems: DockNavItem[] = [
  { label: "Vault", icon: Lock, path: "/vault", permission: "vault:view" },
  { label: "Cloud", icon: Cloud, path: "/cloud", permission: "cloud:view" },
  { label: "Tasks", icon: CheckSquare, path: "/tasks", permission: "tasks:view_own" },
  { label: "Notes", icon: StickyNote, path: "/notes", permission: "notes:view_own" },
];

const bottomItems: DockNavItem[] = [
  { label: "Administration", icon: ShieldCheck, path: "/admin", permission: "admin:access" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

function useIsActive(item: DockNavItem, pathname: string) {
  if (item.matchPaths) return item.matchPaths.includes(pathname);
  return pathname === item.path;
}

function usePerm(permission?: string) {
  // We must call hooks unconditionally — wrap with a check at render time
  const canViewFinance = usePermission("finance:view");
  const canViewSocial  = usePermission("social:view");
  const canAccessAdmin = usePermission("admin:access");
  if (!permission) return true;
  if (permission === "finance:view") return canViewFinance;
  if (permission === "social:view")  return canViewSocial;
  if (permission === "admin:access") return canAccessAdmin;
  return true; // other workspace permissions default to true
}

function DockNavItems({ items }: { items: DockNavItem[] }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const canViewFinance = usePermission("finance:view");
  const canViewSocial  = usePermission("social:view");
  const canAccessAdmin = usePermission("admin:access");

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (permission === "finance:view") return canViewFinance;
    if (permission === "social:view")  return canViewSocial;
    if (permission === "admin:access") return canAccessAdmin;
    return true;
  };

  return (
    <>
      {items.filter(item => hasPermission(item.permission)).map((item) => {
        const isActive = item.matchPaths
          ? item.matchPaths.includes(location.pathname)
          : location.pathname === item.path;

        const accentColor = "var(--accent-color, #10b981)";

        return (
          <VerticalDockItem
            key={item.path}
            onClick={() => navigate(item.path)}
            className="cursor-pointer rounded-xl"
            style={{
              background: isActive ? "var(--nav-item-active-bg)" : "transparent",
              boxShadow: isActive ? `0 0 16px var(--accent-glow, rgba(16,185,129,0.15))` : "none",
            } as React.CSSProperties}
          >
            <VerticalDockLabel>{item.label}</VerticalDockLabel>
            <VerticalDockIcon>
              <item.icon
                style={{
                  width: "100%",
                  height: "100%",
                  strokeWidth: 1.6,
                  color: isActive ? "var(--nav-item-active-color)" : "var(--text-tertiary)",
                  filter: isActive ? `drop-shadow(0 0 6px var(--accent-color))` : "none",
                }}
              />
            </VerticalDockIcon>
          </VerticalDockItem>
        );
      })}
    </>
  );
}

export function AppDock() {
  return (
    <div
      className="hidden lg:flex flex-col items-center shrink-0 h-screen sticky top-0"
      style={{
        width: 68,
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(60px) saturate(180%)",
        WebkitBackdropFilter: "blur(60px) saturate(180%)",
        boxShadow: "1px 0 0 var(--sidebar-border)",
        paddingTop: 12,
        paddingBottom: 12,
        overflowY: "auto",
      } as React.CSSProperties}
    >
      {/* Logo mark */}
      <div style={{ marginBottom: 12, textAlign: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>IC</span>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--divider)", width: 36, marginBottom: 8 }} />

      {/* Dock — fills remaining space */}
      <div className="flex-1 flex items-center justify-center w-full">
        <VerticalDock
          magnification={56}
          distance={110}
          panelWidth={44}
          className="bg-transparent gap-2"
        >
          {/* Top items */}
          <DockNavItems items={topItems} />

          {/* Separator dot */}
          <div style={{ height: 1, background: "var(--divider)", width: 28, margin: "4px auto" }} />

          {/* Sections */}
          <DockNavItems items={sectionItems} />

          {/* Separator */}
          <div style={{ height: 1, background: "var(--divider)", width: 28, margin: "4px auto" }} />

          {/* Workspace */}
          <DockNavItems items={workspaceItems} />

          {/* Separator */}
          <div style={{ height: 1, background: "var(--divider)", width: 28, margin: "4px auto" }} />

          {/* Bottom */}
          <DockNavItems items={bottomItems} />
        </VerticalDock>
      </div>
    </div>
  );
}
