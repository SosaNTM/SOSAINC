import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { usePortal, type PortalConfig } from "@/lib/portalContext";
import { usePermission, PERMISSIONS, type Role } from "@/lib/permissions";
import { SidebarProfileWidget } from "@/components/SidebarProfileWidget";
import { VerticalDock, VerticalDockItem, VerticalDockIcon } from "@/components/ui/dock";
import {
  User,
  Wallet,
  BarChart3,
  ArrowLeftRight,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Lock,
  Cloud,
  CheckSquare,
  StickyNote,
  ShieldCheck,
  TrendingUp,
  Users,
  Radio,
  FileImage,
  Target,
  Swords,
  Zap,
  PieChart,
} from "lucide-react";

// ── AccordionSection is defined at module level to prevent remount on every render ──
interface AccordionSectionProps {
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  portal: PortalConfig | null;
  children: React.ReactNode;
}

function AccordionSection({ label, icon: Icon, isActive, isOpen, onToggle, portal, children }: AccordionSectionProps) {
  return (
    <div>
      <button type="button"
        onClick={onToggle}
        className="flex items-center gap-2.5 w-full transition-all duration-200 group"
        style={{
          padding: "9px 12px",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          background: isActive ? (portal ? `${portal.accent}33` : "rgba(74, 158, 255, 0.20)") : "transparent",
          borderLeft: isActive ? `3px solid ${portal?.accent || "#00D4FF"}` : "3px solid transparent",
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          margin: "1px 0",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <div className="flex items-center justify-center shrink-0" style={{
          width: 28, height: 28, borderRadius: 7,
          background: isActive ? (portal?.accent || "#4A9EFF") : "var(--glass-bg)",
          transition: "background 0.2s",
        }}>
          <Icon style={{ width: 14, height: 14, strokeWidth: 1.8, color: isActive ? "var(--text-inverse)" : "var(--text-secondary)" }} />
        </div>
        <span className="flex-1">{label}</span>
        <ChevronDown
          className="shrink-0 transition-transform duration-200"
          style={{ width: 14, height: 14, color: "var(--text-quaternary)", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      <div style={{ overflow: "hidden", maxHeight: isOpen ? "600px" : "0px", transition: "max-height 0.25s ease" }}>
        <div style={{ paddingLeft: 8, paddingTop: 2, paddingBottom: 2 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const financeSubItems = [
  { title: "Dashboard",     path: "/dashboard",     icon: PieChart        },
  { title: "Transactions",  path: "/transactions",  icon: ArrowLeftRight  },
  { title: "Budget",        path: "/costs",         icon: Wallet          },
  { title: "Subscriptions", path: "/channels",      icon: Zap             },
  { title: "Goals",         path: "/pl-rules",      icon: Target          },
];

const financePaths = financeSubItems.map((i) => i.path);

const socialSubItems = [
  { title: "Overview", path: "/social/overview", icon: TrendingUp },
  { title: "Accounts", path: "/social/accounts", icon: Radio },
  { title: "Analytics", path: "/social/analytics", icon: BarChart3 },
  { title: "Content", path: "/social/content", icon: FileImage },
  { title: "Audience", path: "/social/audience", icon: Users },
  { title: "Competitors", path: "/social/competitors", icon: Swords },
];
const socialPaths = socialSubItems.map((i) => i.path);

const topItems = [
  { title: "Profile", path: "/profile", icon: User },
];

const workspaceItems = [
  { title: "Vault",  path: "/vault",  icon: Lock,        permission: "vault:view",       feature: "vault"  },
  { title: "Cloud",  path: "/cloud",  icon: Cloud,       permission: "cloud:view",       feature: "cloud"  },
  { title: "Tasks",  path: "/tasks",  icon: CheckSquare, permission: "tasks:view_own",   feature: "tasks"  },
  { title: "Notes",  path: "/notes",  icon: StickyNote,  permission: "notes:view_own",   feature: "notes"  },
];

const adminItem = { title: "Administration", path: "/admin", icon: ShieldCheck };
const settingsItem = { title: "Settings", path: "/settings", icon: Settings };

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const groupLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "1.2px",
  color: "var(--text-quaternary)",
  padding: "16px 16px 6px 16px",
};

const dividerStyle = {
  height: 1,
  background: "var(--divider)",
  margin: "8px 16px",
};

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const { portal } = usePortal();
  const canViewFinance = usePermission("finance:view");
  const canViewSocial = usePermission("social:view");
  const canAccessAdmin = usePermission("admin:access");
  const location = useLocation();
  const navigate = useNavigate();
  const prefix = portal ? portal.routePrefix : '';
  const prefixedFinancePaths = financePaths.map(p => `${prefix}${p}`);
  const prefixedSocialPaths = socialPaths.map(p => `${prefix}${p}`);
  const isFinanceActive = prefixedFinancePaths.includes(location.pathname);
  const isSocialActive = prefixedSocialPaths.includes(location.pathname);
  const [financeOpen, setFinanceOpen] = useState(isFinanceActive);
  const [socialOpen, setSocialOpen] = useState(isSocialActive);

  // Auto-expand sections when navigating
  useEffect(() => {
    if (isFinanceActive) setFinanceOpen(true);
  }, [isFinanceActive]);
  useEffect(() => {
    if (isSocialActive) setSocialOpen(true);
  }, [isSocialActive]);

  const renderNavItem = (item: { title: string; path: string; icon: any }, sub = false) => {
    const isActive = location.pathname === `${prefix}${item.path}`;
    return (
      <NavLink
        key={item.path}
        to={`${prefix}${item.path}`}
        onClick={onMobileClose}
        className="flex items-center gap-3 transition-all duration-200"
        style={{
          padding: sub ? "9px 16px 9px 40px" : "12px 16px",
          borderRadius: 12,
          fontSize: sub ? 13 : 14,
          fontWeight: isActive ? 600 : 500,
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
          borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
          margin: sub ? "1px 0" : "2px 0",
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
      >
        <item.icon
          className="shrink-0"
          style={{
            width: sub ? 16 : 20, height: sub ? 16 : 20, strokeWidth: 1.7,
            opacity: isActive ? 1 : 0.7,
          }}
        />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );
  };


  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Back to Hub */}
      {portal && (
        <button type="button"
          onClick={() => { navigate('/hub'); onMobileClose(); }}
          className="flex items-center gap-1.5 mx-4 mt-3 mb-1 transition-all duration-200"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--text-quaternary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = portal.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-quaternary)')}
        >
          <ChevronLeft style={{ width: 12, height: 12 }} />
          Back to Hub
        </button>
      )}
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-4 shrink-0">
        <div className="flex flex-col gap-2">
          <h1 style={{
            fontSize: 18, fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: portal ? '0.15em' : '0.3em', lineHeight: 1.2
          }}>
            {portal ? portal.name : 'S O S A'}
          </h1>
          {portal && (
            <span style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 700,
              color: portal.accent,
              background: `${portal.accent}15`,
              border: `1px solid ${portal.accent}30`,
              borderRadius: 6,
              padding: '2px 8px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}>
              {portal.name}
            </span>
          )}
        </div>
        <button type="button"
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center transition-colors hover:bg-white/5 rounded-lg"
          style={{ width: 28, height: 28, border: "none", cursor: "pointer", background: "transparent", padding: 0 }}
        >
          <ChevronLeft className="h-4 w-4" style={{ color: "var(--text-quaternary)", strokeWidth: 1.7 }} />
        </button>
        <button type="button"
          onClick={onMobileClose}
          className="lg:hidden flex items-center justify-center transition-colors hover:bg-white/5 rounded-lg"
          style={{ width: 28, height: 28, border: "none", cursor: "pointer", background: "transparent", padding: 0 }}
        >
          <X className="h-4 w-4" style={{ color: "var(--text-quaternary)", strokeWidth: 1.7 }} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-3 overflow-y-auto gap-0.5" style={{ paddingBottom: 8 }}>

        {/* Home / Profile */}
        {topItems.map((item) => {
          const isActive = location.pathname === `${prefix}${item.path}`;
          return (
            <NavLink
              key={item.path}
              to={`${prefix}${item.path}`}
              onClick={onMobileClose}
              className="flex items-center gap-2.5 transition-all duration-200"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
                borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
                margin: "1px 0",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent"; }}
            >
              <div className="flex items-center justify-center shrink-0" style={{
                width: 28, height: 28, borderRadius: 7,
                background: isActive ? (portal?.accent || "#4A9EFF") : "var(--glass-bg)",
                transition: "background 0.2s",
              }}>
                <item.icon style={{ width: 14, height: 14, strokeWidth: 1.8, color: isActive ? "var(--text-inverse)" : "var(--text-secondary)" }} />
              </div>
              <span>{item.title}</span>
            </NavLink>
          );
        })}

        {/* Divider */}
        <div style={{ height: 1, background: "var(--divider)", margin: "6px 4px" }} />

        {/* Finance Accordion */}
        {canViewFinance && (
          <AccordionSection
            label="Finance" icon={Wallet}
            isActive={isFinanceActive} isOpen={financeOpen}
            onToggle={() => setFinanceOpen((p) => !p)}
            portal={portal}
          >
            {financeSubItems.map((item) => {
              const isActive = location.pathname === `${prefix}${item.path}`;
              return (
                <NavLink
                  key={item.path} to={`${prefix}${item.path}`} onClick={onMobileClose}
                  className="flex items-center gap-2 transition-all duration-150"
                  style={{
                    padding: "7px 10px 7px 8px", borderRadius: 12, fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
                    borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
                    margin: "1px 0",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent"; }}
                >
                  <item.icon style={{ width: 14, height: 14, strokeWidth: 1.6, opacity: isActive ? 1 : 0.5 }} />
                  {item.title}
                </NavLink>
              );
            })}
          </AccordionSection>
        )}

        {/* Social Accordion */}
        {canViewSocial && !portal?.disabledFeatures?.includes("social") && (
          <AccordionSection
            label="Social" icon={TrendingUp}
            isActive={isSocialActive} isOpen={socialOpen}
            onToggle={() => setSocialOpen((p) => !p)}
            portal={portal}
          >
            {socialSubItems.map((item) => {
              const isActive = location.pathname === `${prefix}${item.path}`;
              return (
                <NavLink
                  key={item.path} to={`${prefix}${item.path}`} onClick={onMobileClose}
                  className="flex items-center gap-2 transition-all duration-150"
                  style={{
                    padding: "7px 10px 7px 8px", borderRadius: 12, fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
                    borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
                    margin: "1px 0",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent"; }}
                >
                  <item.icon style={{ width: 14, height: 14, strokeWidth: 1.6, opacity: isActive ? 1 : 0.5 }} />
                  {item.title}
                </NavLink>
              );
            })}
          </AccordionSection>
        )}

        {/* Divider + Workspace */}
        <div style={{ height: 1, background: "var(--divider)", margin: "6px 4px" }} />
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--text-quaternary)", padding: "4px 12px 6px" }}>
          Workspace
        </p>

        {workspaceItems
          .filter((item) => {
            const allowed = PERMISSIONS[item.permission];
            if (allowed && !allowed.includes((user?.role || "member") as Role)) return false;
            if (item.feature && portal?.disabledFeatures?.includes(item.feature)) return false;
            return true;
          })
          .map((item) => {
            const isActive = location.pathname === `${prefix}${item.path}`;
            return (
              <NavLink
                key={item.path} to={`${prefix}${item.path}`} onClick={onMobileClose}
                className="flex items-center gap-2.5 transition-all duration-200"
                style={{
                  padding: "12px 16px", borderRadius: 12, fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                  background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
                  borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
                  margin: "1px 0",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent"; }}
              >
                <div className="flex items-center justify-center shrink-0" style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: isActive ? (portal?.accent || "#4A9EFF") : "var(--glass-bg)",
                  transition: "background 0.2s",
                }}>
                  <item.icon style={{ width: 14, height: 14, strokeWidth: 1.8, color: isActive ? "var(--text-inverse)" : "var(--text-secondary)" }} />
                </div>
                <span>{item.title}</span>
              </NavLink>
            );
          })}

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 12 }} />

        {/* Bottom pinned: Admin + Settings */}
        <>
            <div style={{ height: 1, background: "var(--divider)", margin: "4px 4px 6px" }} />
            {canAccessAdmin && (!portal || portal.id === "sosa") && (() => {
              const isActive = location.pathname === `${prefix}${adminItem.path}`;
              return (
                <NavLink
                  to={`${prefix}${adminItem.path}`} onClick={onMobileClose}
                  className="flex items-center gap-2.5 transition-all duration-200"
                  style={{
                    padding: "12px 16px", borderRadius: 12, fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
                    borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
                    margin: "1px 0",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent"; }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isActive ? (portal?.accent || "#4A9EFF") : "var(--glass-bg)",
                  }}>
                    <adminItem.icon style={{ width: 14, height: 14, strokeWidth: 1.8, color: isActive ? "var(--text-inverse)" : "var(--text-secondary)" }} />
                  </div>
                  <span>{adminItem.title}</span>
                </NavLink>
              );
            })()}
            {(() => {
              const isActive = location.pathname.includes(`${prefix}${settingsItem.path}`);
              return (
                <NavLink
                  to={`${prefix}${settingsItem.path}`} onClick={onMobileClose}
                  className="flex items-center gap-2.5 transition-all duration-200"
                  style={{
                    padding: "12px 16px", borderRadius: 12, fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? (portal ? `${portal.accent}33` : 'rgba(74, 158, 255, 0.20)') : "transparent",
                    borderLeft: isActive ? `3px solid ${portal?.accent || '#00D4FF'}` : "3px solid transparent",
                    margin: "1px 0",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--nav-hover-bg)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-center justify-center shrink-0" style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: isActive ? (portal?.accent || "#4A9EFF") : "var(--glass-bg)",
                  }}>
                    <settingsItem.icon style={{ width: 14, height: 14, strokeWidth: 1.8, color: isActive ? "var(--text-inverse)" : "var(--text-secondary)" }} />
                  </div>
                  <span>{settingsItem.title}</span>
                </NavLink>
              );
            })()}
        </>
      </nav>

      {/* User card */}
      <SidebarProfileWidget collapsed={collapsed} onMobileClose={onMobileClose} />
    </div>
  );

  const sidebarStyle = {
    background: "transparent",
    borderRight: "1px solid var(--sidebar-border)",
  } as React.CSSProperties;

  // ── Dock items for collapsed mode ──────────────────────────────────────────
  const disabled = portal?.disabledFeatures ?? [];
  const dockGroups = [
    ...(canViewFinance ? [{ label: "Finance", icon: Wallet, path: `${prefix}/dashboard`, matchPaths: prefixedFinancePaths }] : []),
    ...(canViewSocial && !disabled.includes("social") ? [{ label: "Social",  icon: TrendingUp, path: `${prefix}/social/overview`, matchPaths: prefixedSocialPaths }] : []),
    ...(!disabled.includes("vault") ? [{ label: "Vault",  icon: Lock,        path: `${prefix}/vault` }] : []),
    ...(!disabled.includes("cloud") ? [{ label: "Cloud",  icon: Cloud,       path: `${prefix}/cloud` }] : []),
    ...(!disabled.includes("tasks") ? [{ label: "Tasks",  icon: CheckSquare, path: `${prefix}/tasks` }] : []),
    ...(!disabled.includes("notes") ? [{ label: "Notes",  icon: StickyNote,  path: `${prefix}/notes` }] : []),
    ...(canAccessAdmin && (!portal || portal.id === "sosa") ? [{ label: "Admin", icon: ShieldCheck, path: `${prefix}/admin` }] : []),
  ];

  const collapsedDock = (
    <div className="flex flex-col h-full items-center" style={{ paddingTop: 16, paddingBottom: 0 }}>
      {/* Logo mark + toggle button */}
      <h1 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "0.1em", marginBottom: 8 }}>{portal ? portal.name.charAt(0) : 'S'}</h1>
      <button type="button"
        onClick={onToggle}
        className="flex items-center justify-center"
        style={{ width: 28, height: 28, borderRadius: "50%", padding: 0, marginBottom: 6, border: "none", cursor: "pointer", background: "var(--glass-bg)" }}
      >
        <ChevronRight className="h-4 w-4" style={{ color: "var(--text-quaternary)", strokeWidth: 1.7 }} />
      </button>
      <div style={{ height: 1, background: "var(--glass-bg)", width: 32, marginBottom: 4 }} />

      {/* Magnifying dock */}
      <div className="flex-1 flex items-center justify-center w-full">
        <VerticalDock magnification={52} distance={100} panelWidth={40} className="bg-transparent gap-1.5">
          {dockGroups.map((item) => {
            const isActive = "matchPaths" in item
              ? (item.matchPaths as string[]).includes(location.pathname)
              : location.pathname === item.path;
            return (
              <VerticalDockItem
                key={item.path}
                onClick={() => { navigate(item.path); onMobileClose(); }}
                className="cursor-pointer rounded-xl"
                style={{
                  background: isActive ? (portal ? `${portal.accent}33` : "rgba(74, 158, 255, 0.20)") : "transparent",
                } as React.CSSProperties}
              >
                <VerticalDockIcon>
                  <item.icon style={{
                    width: "100%", height: "100%", strokeWidth: 1.6,
                    color: isActive ? "var(--text-primary)" : "var(--text-quaternary)",
                  }} />
                </VerticalDockIcon>
              </VerticalDockItem>
            );
          })}
        </VerticalDock>
      </div>

      {/* Settings button */}
      <button
        type="button"
        onClick={() => { navigate(`${prefix}/settings`); onMobileClose(); }}
        title="Settings"
        style={{
          width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
          background: "var(--glass-bg)", display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Settings style={{ width: 16, height: 16, color: "var(--text-quaternary)", strokeWidth: 1.6 }} />
      </button>

      {/* Profile at bottom */}
      <SidebarProfileWidget collapsed={true} onMobileClose={onMobileClose} />
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden glass-modal-overlay"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-[260px] z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={sidebarStyle}
      >
        {sidebarContent}
      </aside>

      <aside
        className={`hidden lg:flex flex-col shrink-0 h-full transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[260px]"
        }`}
        style={sidebarStyle}
      >
        {collapsed ? collapsedDock : sidebarContent}
      </aside>

      {/* Mobile bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height: 64,
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--glass-border)',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.08)',
        }}
      >
        {[
          { icon: User, label: 'Profile', path: '/profile' },
          { icon: Wallet, label: 'Finance', path: '/dashboard' },
          ...(!disabled.includes("social") ? [{ icon: TrendingUp, label: 'Social', path: '/social/overview' }] : []),
          { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
          ].map((item) => {
          const prefixedPath = `${prefix}${item.path}`;
          const isActive = item.path === '/'
            ? location.pathname === prefixedPath
            : location.pathname.startsWith(prefixedPath);
          return (
            <button type="button"
              key={item.path}
              onClick={() => { navigate(prefixedPath); onMobileClose(); }}
              className="flex flex-col items-center justify-center gap-0.5"
              style={{
                color: isActive ? (portal?.accent || '#4A9EFF') : 'var(--text-tertiary)',
                minWidth: 44,
                minHeight: 44,
              }}
            >
              <item.icon style={{ width: 22, height: 22, strokeWidth: 1.7 }} />
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            </button>
          );
        })}
        <button type="button"
          onClick={() => { navigate(`${prefix}/settings`); onMobileClose(); }}
          className="flex flex-col items-center justify-center gap-0.5"
          style={{ color: 'var(--text-tertiary)', minWidth: 44, minHeight: 44 }}
        >
          <Settings style={{ width: 22, height: 22, strokeWidth: 1.7 }} />
          <span style={{ fontSize: 10, fontWeight: 400 }}>Settings</span>
        </button>
      </nav>
    </>
  );
}
