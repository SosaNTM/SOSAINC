import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, RefreshCw, CreditCard, Repeat, DollarSign,
  Circle, Flag, FileText, Link2, Clock, Tag, Shield, Building2,
  Bell, AlertCircle, Globe, Palette, ChevronRight, Settings2,
} from "lucide-react";

const GOLD = "#C6A961";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";

interface NavItemDef { title: string; path: string; icon: React.FC<any>; }

const NAV_SECTIONS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "GENERALE",
    items: [
      { title: "Profilo Portale",  path: "general/profilo",  icon: Globe    },
      { title: "Aspetto & Tema",   path: "general/aspetto",  icon: Palette  },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { title: "Categorie Entrate",      path: "finance/categorie-entrate",      icon: TrendingUp   },
      { title: "Categorie Uscite",       path: "finance/categorie-uscite",       icon: TrendingDown },
      { title: "Categorie Abbonamenti",  path: "finance/categorie-abbonamenti",  icon: RefreshCw    },
      { title: "Metodi di Pagamento",    path: "finance/metodi-pagamento",       icon: CreditCard   },
      { title: "Regole Ricorrenze",      path: "finance/regole-ricorrenze",      icon: Repeat       },
      { title: "Valute & Tasse",         path: "finance/valute-tasse",           icon: DollarSign   },
    ],
  },
  {
    label: "PROGETTI",
    items: [
      { title: "Stati Progetto",    path: "progetti/stati",          icon: Circle   },
      { title: "Priorità & Label",  path: "progetti/priorita-label", icon: Flag     },
      { title: "Template Task",     path: "progetti/template-task",  icon: FileText },
    ],
  },
  {
    label: "SOCIAL MEDIA",
    items: [
      { title: "Account Collegati",    path: "social/account-collegati",    icon: Link2 },
      { title: "Regole Pubblicazione", path: "social/regole-pubblicazione", icon: Clock },
      { title: "Categorie Contenuti",  path: "social/categorie-contenuti",  icon: Tag   },
    ],
  },
  {
    label: "TEAM",
    items: [
      { title: "Ruoli & Permessi", path: "team/ruoli-permessi", icon: Shield    },
      { title: "Reparti",          path: "team/reparti",        icon: Building2 },
    ],
  },
  {
    label: "NOTIFICHE",
    items: [
      { title: "Canali Notifica", path: "notifiche/canali",       icon: Bell         },
      { title: "Regole Alert",    path: "notifiche/regole-alert", icon: AlertCircle  },
    ],
  },
];

const LABEL_MAP: Record<string, string> = {
  general: "Generale", profilo: "Profilo Portale", aspetto: "Aspetto & Tema",
  finance: "Finance",
  "categorie-entrate": "Categorie Entrate", "categorie-uscite": "Categorie Uscite",
  "categorie-abbonamenti": "Categorie Abbonamenti", "metodi-pagamento": "Metodi di Pagamento",
  "regole-ricorrenze": "Regole Ricorrenze", "valute-tasse": "Valute & Tasse",
  progetti: "Progetti", stati: "Stati Progetto",
  "priorita-label": "Priorità & Label", "template-task": "Template Task",
  social: "Social Media", "account-collegati": "Account Collegati",
  "regole-pubblicazione": "Regole Pubblicazione", "categorie-contenuti": "Categorie Contenuti",
  team: "Team", "ruoli-permessi": "Ruoli & Permessi", reparti: "Reparti",
  notifiche: "Notifiche", canali: "Canali Notifica", "regole-alert": "Regole Alert",
};

function SidebarNavItem({ item }: { item: NavItemDef }) {
  const [hovered, setHovered] = useState(false);
  return (
    <NavLink
      to={item.path}
      end
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", borderRadius: 7,
        fontSize: 12.5, fontWeight: isActive ? 600 : 400,
        color: isActive ? GOLD : hovered ? "#111827" : TEXT_SECONDARY,
        background: isActive ? "#fef9ee" : hovered ? "#f3f4f6" : "transparent",
        borderLeft: `2px solid ${isActive ? GOLD : "transparent"}`,
        textDecoration: "none", transition: "all 0.15s", marginBottom: 1,
      })}
    >
      <item.icon style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.85 }} />
      {item.title}
    </NavLink>
  );
}

export default function SettingsLayout() {
  const location = useLocation();
  const after = location.pathname.split("/settings/")?.[1] ?? "";
  const segments = after ? after.split("/") : [];
  const title =
    segments.length > 0
      ? LABEL_MAP[segments[segments.length - 1]] || segments[segments.length - 1]
      : "Settings";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#ffffff", borderRadius: 16 }}>
      {/* Sidebar */}
      <aside style={{
        width: 232, flexShrink: 0, height: "100%", overflowY: "auto",
        borderRight: `1px solid ${BORDER}`, padding: "16px 10px",
        background: "#f9fafb",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "2px 6px 14px", borderBottom: `1px solid ${BORDER}`, marginBottom: 12,
        }}>
          <Settings2 style={{ width: 15, height: 15, color: GOLD }} />
          <span style={{
            fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY,
            fontFamily: "'Cormorant Garamond', 'Georgia', serif", letterSpacing: "0.08em",
          }}>Settings</span>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 14 }}>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
              color: TEXT_MUTED, textTransform: "uppercase", padding: "0 6px 6px",
            }}>{section.label}</p>
            {section.items.map((item) => <SidebarNavItem key={item.path} item={item} />)}
          </div>
        ))}
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px" }}>
        {segments.length > 0 && (
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            style={{ marginBottom: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              {segments.map((seg, i) => (
                <span key={seg} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {i > 0 && <ChevronRight style={{ width: 11, height: 11, color: "#9ca3af" }} />}
                  <span style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
                    color: i === segments.length - 1 ? GOLD : "#9ca3af",
                  }}>{LABEL_MAP[seg] || seg}</span>
                </span>
              ))}
            </div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY,
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              letterSpacing: "0.01em", lineHeight: 1.2,
            }}>{title}</h1>
          </motion.div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
