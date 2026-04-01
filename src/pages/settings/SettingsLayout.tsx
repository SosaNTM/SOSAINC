import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Palette, TrendingUp, TrendingDown, RefreshCw, CreditCard,
  Repeat, Coins, Columns3, Tags, FileStack, Share2, CalendarClock,
  Layers, Shield, Network, Bell, AlertTriangle, Trash2, Settings2,
} from "lucide-react";

interface NavItemDef { title: string; path: string; icon: React.FC<any>; danger?: boolean }

const NAV_SECTIONS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "GENERALE",
    items: [
      { title: "Profilo Portale",  path: "general/profile",  icon: Building2 },
      { title: "Aspetto",          path: "general/aspetto",  icon: Palette   },
    ],
  },
  {
    label: "FINANZA",
    items: [
      { title: "Categorie Entrate",      path: "finance/categorie-entrate",      icon: TrendingUp   },
      { title: "Categorie Uscite",       path: "finance/categorie-uscite",       icon: TrendingDown },
      { title: "Categorie Abbonamenti",  path: "finance/categorie-abbonamenti",  icon: RefreshCw    },
      { title: "Metodi di Pagamento",    path: "finance/metodi-pagamento",       icon: CreditCard   },
      { title: "Regole Ricorrenza",      path: "finance/regole-ricorrenze",      icon: Repeat       },
      { title: "Valuta e Tasse",         path: "finance/valute-tasse",           icon: Coins        },
      { title: "Categorie Transazioni", path: "finance/categorie-transazioni",  icon: Tags         },
    ],
  },
  {
    label: "PROGETTI",
    items: [
      { title: "Stati Progetto",    path: "progetti/stati",          icon: Columns3  },
      { title: "Priorità e Label",  path: "progetti/priorita-label", icon: Tags      },
      { title: "Template Attività", path: "progetti/template-task",  icon: FileStack },
    ],
  },
  {
    label: "SOCIAL MEDIA",
    items: [
      { title: "Account Social",       path: "social/account-collegati",    icon: Share2        },
      { title: "Regole Pubblicazione",  path: "social/regole-pubblicazione", icon: CalendarClock },
      { title: "Categorie Contenuti",   path: "social/categorie-contenuti",  icon: Layers        },
    ],
  },
  {
    label: "TEAM",
    items: [
      { title: "Ruoli e Permessi", path: "team/ruoli-permessi", icon: Shield  },
      { title: "Dipartimenti",     path: "team/reparti",        icon: Network },
    ],
  },
  {
    label: "NOTIFICHE",
    items: [
      { title: "Canali Notifica", path: "notifiche/canali",       icon: Bell          },
      { title: "Regole Avviso",   path: "notifiche/regole-alert", icon: AlertTriangle },
    ],
  },
];

const DANGER_SECTION: NavItemDef[] = [
  { title: "Reset Portale", path: "danger-zone", icon: Trash2, danger: true },
];

function SidebarNavItem({ item }: { item: NavItemDef }) {
  return (
    <NavLink
      to={item.path}
      end
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", borderRadius: "var(--radius-sm)",
        fontSize: 13, fontWeight: isActive ? 500 : 400,
        fontFamily: "var(--font-body)",
        color: item.danger
          ? "var(--color-error)"
          : isActive
            ? "var(--accent-primary)"
            : "var(--text-secondary)",
        background: isActive ? "var(--accent-primary-soft)" : "transparent",
        borderLeft: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
        textDecoration: "none",
        transition: "all 0.15s ease",
        marginBottom: 1,
      })}
    >
      <item.icon style={{
        width: 16, height: 16, strokeWidth: 1.5, flexShrink: 0,
        opacity: 0.85,
      }} />
      {item.title}
    </NavLink>
  );
}

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <div style={{
      display: "flex", height: "100%", overflow: "hidden",
      background: "var(--glass-bg-elevated)",
      backdropFilter: "var(--glass-blur-heavy)",
      WebkitBackdropFilter: "var(--glass-blur-heavy)",
      border: "0.5px solid var(--glass-border)",
      borderRadius: "var(--radius-xl)",
    }}>
      {/* Settings Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, height: "100%", overflowY: "auto",
        background: "var(--glass-bg-subtle)",
        borderRight: "1px solid var(--divider)",
        borderRadius: "var(--radius-xl) 0 0 var(--radius-xl)",
        padding: "20px 12px",
      }}>
        {/* Header */}
        <div style={{ padding: "0 8px 16px", borderBottom: "1px solid var(--divider)", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Settings2 style={{ width: 16, height: 16, color: "var(--accent-primary)" }} />
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600,
              color: "var(--text-primary)", letterSpacing: "0.02em",
            }}>Impostazioni</span>
          </div>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: "var(--text-small)",
            color: "var(--text-tertiary)",
          }}>Pannello di controllo</p>
        </div>

        {/* Nav Sections */}
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} style={{ marginBottom: 14 }}>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
              textTransform: "uppercase", letterSpacing: "0.08em",
              color: "var(--text-tertiary)",
              padding: "0 8px 6px",
              marginTop: si === 0 ? 0 : 20,
            }}>{section.label}</p>
            {section.items.map((item) => <SidebarNavItem key={item.path} item={item} />)}
          </div>
        ))}

        {/* Divider + Danger Zone */}
        <div style={{
          height: 1, background: "var(--divider)",
          margin: "16px 8px",
        }} />
        <p style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
          textTransform: "uppercase", letterSpacing: "0.08em",
          color: "var(--color-error)",
          padding: "0 8px 6px",
        }}>ZONA PERICOLOSA</p>
        {DANGER_SECTION.map((item) => <SidebarNavItem key={item.path} item={item} />)}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px 48px" }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
