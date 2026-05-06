import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTodayCount } from "@/hooks/leadgen/useTodayCount";
import { useLeadgenCurrentMember } from "@/hooks/leadgen/useLeadgenMembers";
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
  BarChart2,
  Bitcoin,
  Gift,
  Package,
  FileText,
  Building2,
  Crosshair,
  Globe,
  MonitorOff,
  History,
  CalendarClock,
  LayoutDashboard,
} from "lucide-react";

// ── Leadgen sidebar section (owns useTodayCount so it only runs for REDX) ─────
function LeadgenSidebarSection({
  isActive, isOpen, onToggle, portal, accentOf, prefix, location, onMobileClose,
}: {
  isActive: boolean; isOpen: boolean; onToggle: () => void;
  portal: PortalConfig | null;
  accentOf: (p: PortalConfig | null) => string;
  prefix: string; location: { pathname: string }; onMobileClose: () => void;
}) {
  const { total } = useTodayCount();
  const currentMember = useLeadgenCurrentMember();
  const isLeadgenAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  const renderLabel = () => (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      Lead Generation
      {total > 0 && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, background: "var(--accent-primary)", color: "#000", padding: "1px 5px", lineHeight: 1.4 }}>
          {total}
        </span>
      )}
    </span>
  );

  const navLinkStyle = (active: boolean) => ({
    padding: "7px 14px 7px 10px", borderRadius: 0,
    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: active ? 600 : 400,
    letterSpacing: "0.03em",
    color: active ? "var(--text-primary)" : "var(--text-tertiary)",
    background: active ? "rgba(255,255,255,0.04)" : "transparent",
    borderLeft: active ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
  });

  return (
    <AccordionSection
      label="Lead Generation"
      icon={Crosshair}
      isActive={isActive} isOpen={isOpen}
      onToggle={onToggle} portal={portal}
      renderLabel={renderLabel}
    >
      {leadgenSubItems.map((item) => {
        const isItemActive =
          location.pathname === `${prefix}${item.path}` ||
          (item.path !== "/leadgen/dashboard" && location.pathname.startsWith(`${prefix}${item.path}/`));
        return (
          <NavLink
            key={item.path} to={`${prefix}${item.path}`} onClick={onMobileClose}
            className="flex items-center gap-2"
            style={navLinkStyle(isItemActive)}
            onMouseEnter={(e) => { if (!isItemActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
            onMouseLeave={(e) => { if (!isItemActive) e.currentTarget.style.background = "transparent"; }}
          >
            <item.icon style={{ width: 13, height: 13, strokeWidth: 1.6, opacity: isItemActive ? 1 : 0.4 }} />
            {item.title}
            {item.path === "/leadgen/today" && total > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, background: "var(--accent-primary)", color: "#000", padding: "1px 5px", lineHeight: 1.4, marginLeft: "auto" }}>
                {total}
              </span>
            )}
          </NavLink>
        );
      })}

      {isLeadgenAdmin && (() => {
        const overviewPath = `${prefix}/leadgen/overview`;
        const isOverviewActive = location.pathname === overviewPath;
        return (
          <NavLink
            to={overviewPath} onClick={onMobileClose}
            className="flex items-center gap-2"
            style={navLinkStyle(isOverviewActive)}
            onMouseEnter={(e) => { if (!isOverviewActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
            onMouseLeave={(e) => { if (!isOverviewActive) e.currentTarget.style.background = "transparent"; }}
          >
            <BarChart2 style={{ width: 13, height: 13, strokeWidth: 1.6, opacity: isOverviewActive ? 1 : 0.4 }} />
            Overview
          </NavLink>
        );
      })()}
    </AccordionSection>
  );
}

// ── AccordionSection is defined at module level to prevent remount on every render ──
interface AccordionSectionProps {
  label: React.ReactNode;
  icon: React.ElementType;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  portal: PortalConfig | null;
  children: React.ReactNode;
  renderLabel?: () => React.ReactNode;
}

function AccordionSection({ label, icon: Icon, isActive, isOpen, onToggle, portal, children, renderLabel }: AccordionSectionProps) {
  return (
    <div>
      <button type="button"
        onClick={onToggle}
        className="flex items-center gap-2.5 w-full"
        style={{
          padding: "9px 14px",
          borderRadius: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
          background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
          borderLeft: isActive ? `3px solid ${portal?.accent || "var(--sosa-yellow)"}` : "3px solid transparent",
          borderTop: "none", borderRight: "none", borderBottom: "none",
          cursor: "pointer", textAlign: "left",
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <div className="flex items-center justify-center shrink-0" style={{
          width: 26, height: 26, borderRadius: 0,
          background: isActive ? (portal?.accent || "var(--sosa-yellow)") : "var(--sosa-bg-2)",
          border: isActive ? "none" : "1px solid var(--sosa-border)",
        }}>
          <Icon style={{ width: 13, height: 13, strokeWidth: 1.8, color: isActive ? "#000" : "var(--sosa-white-40)" }} />
        </div>
        <span className="flex-1">{renderLabel ? renderLabel() : label}</span>
        <ChevronDown
          className="shrink-0 transition-transform duration-200"
          style={{ width: 12, height: 12, color: "var(--sosa-white-20)", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      <div style={{ overflow: "hidden", maxHeight: isOpen ? "600px" : "0px", transition: "max-height 0.25s ease" }}>
        <div style={{ paddingLeft: 6, paddingTop: 2, paddingBottom: 2 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Personal finance items (shared across ALL portals)
const personalFinanceSubItems = [
  { title: "Dashboard",     path: "/dashboard",     icon: PieChart                       },
  { title: "Recap",         path: "/recap",         icon: BarChart2                      },
  { title: "Transactions",  path: "/transactions",  icon: ArrowLeftRight                 },
  { title: "Budget",        path: "/costs",         icon: Wallet                         },
  { title: "Subscriptions", path: "/channels",      icon: Zap                            },
  { title: "Goals",         path: "/pl-rules",      icon: Target                         },
  { title: "Crypto",        path: "/crypto",        icon: Bitcoin,    feature: "crypto"      },
  { title: "Gift Cards",   path: "/gift-cards",    icon: Gift,       feature: "gift-cards"  },
  { title: "Reports",       path: "/reports",       icon: FileText,   comingSoon: true   },
  { title: "Forecast",      path: "/forecast",      icon: TrendingUp, comingSoon: true   },
];

// Business finance items — removed per request (COGS, OPEX, P&L now handled via
// transaction classification + waterfall dashboard instead of separate pages)
const businessFinanceSubItems: typeof personalFinanceSubItems = [];

// Combined paths for active state detection
const allFinancePaths = [
  ...personalFinanceSubItems.map((i) => i.path),
  ...businessFinanceSubItems.map((i) => i.path),
];

const socialSubItems = [
  { title: "Overview", path: "/social/overview", icon: TrendingUp },
  { title: "Accounts", path: "/social/accounts", icon: Radio },
  { title: "Analytics", path: "/social/analytics", icon: BarChart3 },
  { title: "Content", path: "/social/content", icon: FileImage },
  { title: "Audience", path: "/social/audience", icon: Users },
  { title: "Competitors", path: "/social/competitors", icon: Swords },
];
const socialPaths = socialSubItems.map((i) => i.path);

const leadgenSubItems = [
  { title: "Dashboard",     path: "/leadgen/dashboard",    icon: LayoutDashboard },
  { title: "Da Fare Oggi",  path: "/leadgen/today",        icon: CalendarClock   },
  { title: "Nuova ricerca", path: "/leadgen/search",       icon: Crosshair       },
  { title: "Senza sito",    path: "/leadgen/no-website",   icon: MonitorOff      },
  { title: "Con sito",      path: "/leadgen/with-website", icon: Globe           },
  { title: "Storico",       path: "/leadgen/searches",     icon: History         },
  { title: "Impostazioni",  path: "/leadgen/settings",     icon: Settings        },
];
const leadgenPaths = leadgenSubItems.map((i) => i.path);

const topItems = [
  { title: "Profile", path: "/profile", icon: User },
];

const workspaceItems = [
  { title: "Vault",     path: "/vault",     icon: Lock,        permission: "vault:view",       feature: "vault"  },
  { title: "Cloud",     path: "/cloud",     icon: Cloud,       permission: "cloud:view",       feature: "cloud"  },
  { title: "Inventory", path: "/inventory", icon: Package,     permission: "inventory:view",   feature: "inventory" },
  { title: "Tasks",     path: "/tasks",     icon: CheckSquare, permission: "tasks:view_own",   feature: "tasks"  },
  { title: "Notes",     path: "/notes",     icon: StickyNote,  permission: "notes:view_own",   feature: "notes"  },
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
  fontFamily:    "var(--font-mono)",
  fontSize:      9,
  fontWeight:    600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.12em",
  color:         "var(--sosa-white-20)",
  padding:       "14px 16px 5px 16px",
};

const dividerStyle = {
  height:     1,
  background: "var(--sosa-border)",
  margin:     "8px 16px",
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
  const activeFinanceItems = [...personalFinanceSubItems, ...businessFinanceSubItems];
  const prefixedFinancePaths = allFinancePaths.map(p => `${prefix}${p}`);
  const prefixedSocialPaths = socialPaths.map(p => `${prefix}${p}`);
  const isFinanceActive = prefixedFinancePaths.some(p => location.pathname === p || location.pathname.startsWith(p));
  const isSocialActive = prefixedSocialPaths.includes(location.pathname);
  const prefixedLeadgenPaths = leadgenPaths.map((p) => `${prefix}${p}`);
  const isLeadgenActive = prefixedLeadgenPaths.some(
    (p) => location.pathname === p || location.pathname.startsWith(p)
  ) || location.pathname.startsWith(`${prefix}/leadgen`);
  const [financeOpen, setFinanceOpen] = useState(isFinanceActive);
  const [socialOpen, setSocialOpen] = useState(isSocialActive);
  const [leadgenOpen, setLeadgenOpen] = useState(isLeadgenActive);

  // Auto-expand sections when navigating
  useEffect(() => {
    if (isFinanceActive) setFinanceOpen(true);
  }, [isFinanceActive]);
  useEffect(() => {
    if (isSocialActive) setSocialOpen(true);
  }, [isSocialActive]);
  useEffect(() => {
    if (isLeadgenActive) setLeadgenOpen(true);
  }, [isLeadgenActive]);

  const accentOf = (p: PortalConfig | null) => p?.accent || "var(--sosa-yellow)";

  const renderNavItem = (item: { title: string; path: string; icon: React.ElementType }, sub = false) => {
    const isActive = location.pathname === `${prefix}${item.path}`;
    return (
      <NavLink
        key={item.path}
        to={`${prefix}${item.path}`}
        onClick={onMobileClose}
        className="flex items-center gap-2.5"
        style={{
          padding: sub ? "8px 14px 8px 36px" : "10px 14px",
          borderRadius: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          letterSpacing: "0.03em",
          color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
          background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
          borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <item.icon className="shrink-0" style={{ width: sub ? 14 : 16, height: sub ? 14 : 16, strokeWidth: 1.6, opacity: isActive ? 1 : 0.45 }} />
        {!collapsed && <span>{item.title}</span>}
      </NavLink>
    );
  };


  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Back to Hub */}
      {portal && (
        <button type="button"
          onClick={() => { navigate('/hub'); onMobileClose(); }}
          className="flex items-center gap-1.5 mx-4 mt-3 mb-1"
          style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500, textTransform: "uppercase",
            letterSpacing: "0.10em", color: "var(--sosa-white-20)", background: "none", border: "none",
            cursor: "pointer", padding: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--portal-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sosa-white-20)")}
        >
          <ChevronLeft style={{ width: 10, height: 10 }} />
          Back to Hub
        </button>
      )}
      {/* Header — portal name + collapse toggle */}
      <div className="flex items-center justify-between px-4 pt-3 pb-3 shrink-0" style={{ borderBottom: "1px solid var(--sosa-border)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            color: "var(--sosa-yellow)", letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            {portal ? portal.name : "SOSA INC."}
          </span>
          {portal && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--sosa-white-40)",
              letterSpacing: "0.10em", textTransform: "uppercase",
            }}>
              {portal.subtitle}
            </span>
          )}
        </div>
        <button type="button"
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center"
          style={{ width: 24, height: 24, border: "1px solid var(--sosa-border)", cursor: "pointer", background: "transparent", padding: 0 }}
        >
          <ChevronLeft className="h-3.5 w-3.5" style={{ color: "var(--sosa-white-40)", strokeWidth: 1.7 }} />
        </button>
        <button type="button"
          onClick={onMobileClose}
          className="lg:hidden flex items-center justify-center"
          style={{ width: 24, height: 24, border: "1px solid var(--sosa-border)", cursor: "pointer", background: "transparent", padding: 0 }}
        >
          <X className="h-3.5 w-3.5" style={{ color: "var(--sosa-white-40)", strokeWidth: 1.7 }} />
        </button>
      </div>

      {/* Navigation — scrollable middle section */}
      <nav className="flex-1 flex flex-col px-3 overflow-y-auto" style={{ paddingTop: 6, paddingBottom: 6, gap: 2 }}>

        {/* Profile */}
        {topItems.map((item) => {
          const isActive = location.pathname === `${prefix}${item.path}`;
          return (
            <NavLink
              key={item.path}
              to={`${prefix}${item.path}`}
              onClick={onMobileClose}
              className="flex items-center gap-2.5"
              style={{
                padding: "10px 14px",
                borderRadius: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.03em",
                color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex items-center justify-center shrink-0" style={{
                width: 26, height: 26, borderRadius: 0,
                background: isActive ? accentOf(portal) : "var(--sosa-bg-2)",
                border: isActive ? "none" : "1px solid var(--sosa-border)",
              }}>
                <item.icon style={{ width: 13, height: 13, strokeWidth: 1.8, color: isActive ? "#000" : "var(--sosa-white-40)" }} />
              </div>
              <span>{item.title}</span>
            </NavLink>
          );
        })}

        <div style={{ height: 1, background: "var(--sosa-border)", margin: "8px 4px" }} />

        {/* Finance Accordion */}
        {canViewFinance && (
          <AccordionSection
            label="Finance" icon={Wallet}
            isActive={isFinanceActive} isOpen={financeOpen}
            onToggle={() => setFinanceOpen((p) => !p)}
            portal={portal}
          >
            {activeFinanceItems.filter(item =>
              !("comingSoon" in item && item.comingSoon) &&
              !("feature" in item && portal?.disabledFeatures?.includes((item as { feature?: string }).feature!))
            ).map((item) => {
              const isActive = location.pathname === `${prefix}${item.path}` || location.pathname.startsWith(`${prefix}${item.path}/`);
              return (
                <NavLink
                  key={item.path} to={`${prefix}${item.path}`} onClick={onMobileClose}
                  className="flex items-center gap-2"
                  style={{
                    padding: "7px 14px 7px 10px", borderRadius: 0,
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: isActive ? 600 : 400,
                    letterSpacing: "0.03em",
                    color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                    background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <item.icon style={{ width: 13, height: 13, strokeWidth: 1.6, opacity: isActive ? 1 : 0.4 }} />
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
                  className="flex items-center gap-2"
                  style={{
                    padding: "7px 14px 7px 10px", borderRadius: 0,
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: isActive ? 600 : 400,
                    letterSpacing: "0.03em",
                    color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                    background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                    borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <item.icon style={{ width: 13, height: 13, strokeWidth: 1.6, opacity: isActive ? 1 : 0.4 }} />
                  {item.title}
                </NavLink>
              );
            })}
          </AccordionSection>
        )}

        {/* Lead Generation — REDX only */}
        {portal?.id === "redx" && (
          <LeadgenSidebarSection
            isActive={isLeadgenActive} isOpen={leadgenOpen}
            onToggle={() => setLeadgenOpen((p) => !p)}
            portal={portal} accentOf={accentOf}
            prefix={prefix} location={location} onMobileClose={onMobileClose}
          />
        )}

        <div style={{ height: 1, background: "var(--sosa-border)", margin: "8px 4px" }} />
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--sosa-white-20)", padding: "2px 14px 5px" }}>
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
                className="flex items-center gap-2.5"
                style={{
                  padding: "10px 14px", borderRadius: 0,
                  fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.03em",
                  color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                  background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                  borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div className="flex items-center justify-center shrink-0" style={{
                  width: 26, height: 26, borderRadius: 0,
                  background: isActive ? accentOf(portal) : "var(--sosa-bg-2)",
                  border: isActive ? "none" : "1px solid var(--sosa-border)",
                }}>
                  <item.icon style={{ width: 13, height: 13, strokeWidth: 1.8, color: isActive ? "#000" : "var(--sosa-white-40)" }} />
                </div>
                <span>{item.title}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* Bottom pinned: Administration + Settings + User card */}
      <div style={{ borderTop: "1px solid var(--sosa-border)", flexShrink: 0 }}>
        {/* Administration */}
        {canAccessAdmin && (!portal || portal.id === "sosa") && (() => {
          const isActive = location.pathname === `${prefix}${adminItem.path}`;
          return (
            <NavLink
              to={`${prefix}${adminItem.path}`} onClick={onMobileClose}
              className="flex items-center gap-2.5"
              style={{
                padding: "10px 14px", borderRadius: 0,
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.03em",
                color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex items-center justify-center shrink-0" style={{
                width: 26, height: 26, borderRadius: 0,
                background: isActive ? accentOf(portal) : "var(--sosa-bg-2)",
                border: isActive ? "none" : "1px solid var(--sosa-border)",
              }}>
                <adminItem.icon style={{ width: 13, height: 13, strokeWidth: 1.8, color: isActive ? "#000" : "var(--sosa-white-40)" }} />
              </div>
              <span>{adminItem.title}</span>
            </NavLink>
          );
        })()}

        {/* Settings */}
        {(user?.role === "owner" || user?.role === "admin") && (() => {
          const isActive = location.pathname.includes(`${prefix}${settingsItem.path}`);
          return (
            <NavLink
              to={`${prefix}${settingsItem.path}`} onClick={onMobileClose}
              className="flex items-center gap-2.5"
              style={{
                padding: "10px 14px", borderRadius: 0,
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.03em",
                color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
                background: isActive ? "rgba(255,255,255,0.04)" : "transparent",
                borderLeft: isActive ? `3px solid ${accentOf(portal)}` : "3px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex items-center justify-center shrink-0" style={{
                width: 26, height: 26, borderRadius: 0,
                background: isActive ? accentOf(portal) : "var(--sosa-bg-2)",
                border: isActive ? "none" : "1px solid var(--sosa-border)",
              }}>
                <settingsItem.icon style={{ width: 13, height: 13, strokeWidth: 1.8, color: isActive ? "#000" : "var(--sosa-white-40)" }} />
              </div>
              <span>{settingsItem.title}</span>
            </NavLink>
          );
        })()}

        {/* User card */}
        <SidebarProfileWidget collapsed={collapsed} onMobileClose={onMobileClose} />
      </div>
    </div>
  );

  const sidebarStyle = {
    background:  "var(--sosa-bg)",
    borderRight: "1px solid var(--sosa-border)",
  } as React.CSSProperties;

  // ── Dock items for collapsed mode ──────────────────────────────────────────
  const disabled = portal?.disabledFeatures ?? [];
  const dockGroups = [
    { label: "Profile", icon: User, path: `${prefix}/profile` },
    ...(canViewFinance ? [{ label: "Finance",   icon: Wallet,      path: `${prefix}/dashboard`,       matchPaths: prefixedFinancePaths }] : []),
    ...(canViewSocial && !disabled.includes("social") ? [{ label: "Social",  icon: TrendingUp, path: `${prefix}/social/overview`, matchPaths: prefixedSocialPaths }] : []),
    ...(portal?.id === "redx" ? [{ label: "Lead Gen", icon: Crosshair, path: `${prefix}/leadgen/today`, matchPaths: prefixedLeadgenPaths }] : []),
    ...(!disabled.includes("vault") ? [{ label: "Vault",     icon: Lock,        path: `${prefix}/vault` }] : []),
    ...(!disabled.includes("cloud") ? [{ label: "Cloud",     icon: Cloud,       path: `${prefix}/cloud` }] : []),
    ...(!disabled.includes("inventory") ? [{ label: "Inventory", icon: Package,  path: `${prefix}/inventory` }] : []),
    ...(!disabled.includes("tasks") ? [{ label: "Tasks",     icon: CheckSquare, path: `${prefix}/tasks` }] : []),
    ...(!disabled.includes("notes") ? [{ label: "Notes",     icon: StickyNote,  path: `${prefix}/notes` }] : []),
    ...(canAccessAdmin && (!portal || portal.id === "sosa") ? [{ label: "Admin", icon: ShieldCheck, path: `${prefix}/admin` }] : []),
  ];

  const collapsedDock = (
    <div className="flex flex-col h-full items-center" style={{ paddingTop: 12, paddingBottom: 0 }}>
      {/* Portal logo mark */}
      <div style={{
        width: 38, height: 38, marginBottom: 2,
        background: "var(--sosa-yellow)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 900,
          color: "#000", letterSpacing: "0.02em", lineHeight: 1,
        }}>
          {portal ? portal.name.charAt(0) : "S"}
        </span>
      </div>

      {/* Expand toggle */}
      <button type="button"
        onClick={onToggle}
        className="flex items-center justify-center"
        style={{
          width: 38, height: 24, borderRadius: 0, padding: 0, marginTop: 0, marginBottom: 10,
          border: "none", borderBottom: "1px solid var(--sosa-border)",
          cursor: "pointer", background: "var(--sosa-bg-2)",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--sosa-yellow) 8%, transparent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--sosa-bg-2)"; }}
      >
        <ChevronRight className="h-3 w-3" style={{ color: "var(--sosa-white-40)", strokeWidth: 2 }} />
      </button>

      <div style={{ height: 1, background: "var(--sosa-border)", width: 38, marginBottom: 6 }} />

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
                className="cursor-pointer"
                style={{
                  background:  isActive ? "var(--portal-accent-dim)" : "transparent",
                  borderLeft:  isActive ? "3px solid var(--portal-accent)" : "3px solid transparent",
                } as React.CSSProperties}
              >
                <VerticalDockIcon>
                  <item.icon style={{
                    width: "100%", height: "100%", strokeWidth: 1.6,
                    color: isActive ? "var(--portal-accent)" : "var(--sosa-yellow)",
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
          width: 40, height: 36, cursor: "pointer",
          background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Settings style={{ width: 16, height: 16, color: "var(--sosa-yellow)", strokeWidth: 1.6 }} />
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
        className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[260px]"
        }`}
        style={{ ...sidebarStyle, height: "100%" }}
      >
        {collapsed ? collapsedDock : sidebarContent}
      </aside>

      {/* Mobile bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height:     64,
          background: "var(--sosa-bg)",
          borderTop:  "1px solid var(--sosa-border)",
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
                color: isActive ? "var(--portal-accent)" : "var(--sosa-yellow)",
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
