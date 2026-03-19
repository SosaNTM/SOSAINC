import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, RefreshCw, CreditCard, Repeat, DollarSign,
  Circle, Flag, FileText, Link2, Clock, Tag, Shield, Building2,
  Bell, AlertCircle, Globe, Palette, ChevronRight, Settings2, X,
} from "lucide-react";

// Sub-page components
import PortalProfile from "@/pages/settings/general/PortalProfile";
import Appearance from "@/pages/settings/general/Appearance";
import IncomeCategories from "@/pages/settings/finance/IncomeCategories";
import ExpenseCategories from "@/pages/settings/finance/ExpenseCategories";
import SubscriptionCategories from "@/pages/settings/finance/SubscriptionCategories";
import PaymentMethods from "@/pages/settings/finance/PaymentMethods";
import RecurrenceRules from "@/pages/settings/finance/RecurrenceRules";
import CurrencyTax from "@/pages/settings/finance/CurrencyTax";
import ProjectStatuses from "@/pages/settings/projects/ProjectStatuses";
import PrioritiesLabels from "@/pages/settings/projects/PrioritiesLabels";
import TaskTemplates from "@/pages/settings/projects/TaskTemplates";
import SocialAccountsSettings from "@/pages/settings/social/SocialAccountsSettings";
import PublishingRules from "@/pages/settings/social/PublishingRules";
import ContentCategories from "@/pages/settings/social/ContentCategories";
import RolesPermissions from "@/pages/settings/team/RolesPermissions";
import Departments from "@/pages/settings/team/Departments";
import NotificationChannels from "@/pages/settings/notifications/NotificationChannels";
import AlertRules from "@/pages/settings/notifications/AlertRules";

const GOLD = "#C6A961";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";

type PageKey =
  | "general/profilo" | "general/aspetto"
  | "finance/categorie-entrate" | "finance/categorie-uscite" | "finance/categorie-abbonamenti"
  | "finance/metodi-pagamento" | "finance/regole-ricorrenze" | "finance/valute-tasse"
  | "progetti/stati" | "progetti/priorita-label" | "progetti/template-task"
  | "social/account-collegati" | "social/regole-pubblicazione" | "social/categorie-contenuti"
  | "team/ruoli-permessi" | "team/reparti"
  | "notifiche/canali" | "notifiche/regole-alert";

const PAGE_COMPONENTS: Record<PageKey, React.FC> = {
  "general/profilo": PortalProfile,
  "general/aspetto": Appearance,
  "finance/categorie-entrate": IncomeCategories,
  "finance/categorie-uscite": ExpenseCategories,
  "finance/categorie-abbonamenti": SubscriptionCategories,
  "finance/metodi-pagamento": PaymentMethods,
  "finance/regole-ricorrenze": RecurrenceRules,
  "finance/valute-tasse": CurrencyTax,
  "progetti/stati": ProjectStatuses,
  "progetti/priorita-label": PrioritiesLabels,
  "progetti/template-task": TaskTemplates,
  "social/account-collegati": SocialAccountsSettings,
  "social/regole-pubblicazione": PublishingRules,
  "social/categorie-contenuti": ContentCategories,
  "team/ruoli-permessi": RolesPermissions,
  "team/reparti": Departments,
  "notifiche/canali": NotificationChannels,
  "notifiche/regole-alert": AlertRules,
};

const LABEL_MAP: Record<string, string> = {
  "general/profilo": "Profilo Portale",
  "general/aspetto": "Aspetto & Tema",
  "finance/categorie-entrate": "Categorie Entrate",
  "finance/categorie-uscite": "Categorie Uscite",
  "finance/categorie-abbonamenti": "Categorie Abbonamenti",
  "finance/metodi-pagamento": "Metodi di Pagamento",
  "finance/regole-ricorrenze": "Regole Ricorrenze",
  "finance/valute-tasse": "Valute & Tasse",
  "progetti/stati": "Stati Progetto",
  "progetti/priorita-label": "Priorità & Label",
  "progetti/template-task": "Template Task",
  "social/account-collegati": "Account Collegati",
  "social/regole-pubblicazione": "Regole Pubblicazione",
  "social/categorie-contenuti": "Categorie Contenuti",
  "team/ruoli-permessi": "Ruoli & Permessi",
  "team/reparti": "Reparti",
  "notifiche/canali": "Canali Notifica",
  "notifiche/regole-alert": "Regole Alert",
};

interface NavItemDef { title: string; key: PageKey; icon: React.FC<any>; }

const NAV_SECTIONS: { label: string; items: NavItemDef[] }[] = [
  {
    label: "GENERALE",
    items: [
      { title: "Profilo Portale", key: "general/profilo",  icon: Globe    },
      { title: "Aspetto & Tema",  key: "general/aspetto",  icon: Palette  },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { title: "Categorie Entrate",     key: "finance/categorie-entrate",     icon: TrendingUp   },
      { title: "Categorie Uscite",      key: "finance/categorie-uscite",      icon: TrendingDown },
      { title: "Categorie Abbonamenti", key: "finance/categorie-abbonamenti", icon: RefreshCw    },
      { title: "Metodi di Pagamento",   key: "finance/metodi-pagamento",      icon: CreditCard   },
      { title: "Regole Ricorrenze",     key: "finance/regole-ricorrenze",     icon: Repeat       },
      { title: "Valute & Tasse",        key: "finance/valute-tasse",          icon: DollarSign   },
    ],
  },
  {
    label: "PROGETTI",
    items: [
      { title: "Stati Progetto",   key: "progetti/stati",          icon: Circle   },
      { title: "Priorità & Label", key: "progetti/priorita-label", icon: Flag     },
      { title: "Template Task",    key: "progetti/template-task",  icon: FileText },
    ],
  },
  {
    label: "SOCIAL MEDIA",
    items: [
      { title: "Account Collegati",    key: "social/account-collegati",    icon: Link2 },
      { title: "Regole Pubblicazione", key: "social/regole-pubblicazione", icon: Clock },
      { title: "Categorie Contenuti",  key: "social/categorie-contenuti",  icon: Tag   },
    ],
  },
  {
    label: "TEAM",
    items: [
      { title: "Ruoli & Permessi", key: "team/ruoli-permessi", icon: Shield    },
      { title: "Reparti",          key: "team/reparti",        icon: Building2 },
    ],
  },
  {
    label: "NOTIFICHE",
    items: [
      { title: "Canali Notifica", key: "notifiche/canali",       icon: Bell        },
      { title: "Regole Alert",    key: "notifiche/regole-alert", icon: AlertCircle },
    ],
  },
];

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [currentPage, setCurrentPage] = useState<PageKey>("general/profilo");
  const [hovered, setHovered] = useState<string | null>(null);

  const PageComponent = PAGE_COMPONENTS[currentPage];
  const pageTitle = LABEL_MAP[currentPage] ?? currentPage;
  const sectionLabel = NAV_SECTIONS.find(s => s.items.some(i => i.key === currentPage))?.label ?? "";

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="settings-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
      >
        {/* Dialog */}
        <motion.div
          key="settings-dialog"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "90vw", maxWidth: 1100,
            height: "85vh", maxHeight: 760,
            background: "#ffffff",
            borderRadius: 18,
            boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 4px 24px rgba(0,0,0,0.15)",
            display: "flex",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 14, right: 14, zIndex: 10,
              width: 30, height: 30, borderRadius: "50%",
              background: "#f3f4f6", border: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#6b7280", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e5e7eb"; e.currentTarget.style.color = "#111827"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f3f4f6"; e.currentTarget.style.color = "#6b7280"; }}
          >
            <X size={14} />
          </button>

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
              <Settings2 size={15} color={GOLD} />
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
                {section.items.map((item) => {
                  const isActive = currentPage === item.key;
                  const isHovered = hovered === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setCurrentPage(item.key)}
                      onMouseEnter={() => setHovered(item.key)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "7px 10px", borderRadius: 7, marginBottom: 1,
                        fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                        color: isActive ? GOLD : isHovered ? "#111827" : TEXT_SECONDARY,
                        background: isActive ? "#fef9ee" : isHovered ? "#f3f4f6" : "transparent",
                        borderLeft: `2px solid ${isActive ? GOLD : "transparent"}`,
                        border: "none", cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <item.icon style={{ width: 13, height: 13, flexShrink: 0, opacity: 0.85 }} />
                      {item.title}
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          {/* Content */}
          <main style={{ flex: 1, overflowY: "auto", padding: "24px 32px 48px" }}>
            {/* Breadcrumb + title */}
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              style={{ marginBottom: 24 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.04em" }}>
                  {sectionLabel}
                </span>
                <ChevronRight size={11} color="#9ca3af" />
                <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.04em" }}>
                  {pageTitle}
                </span>
              </div>
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: TEXT_PRIMARY,
                fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                letterSpacing: "0.01em", lineHeight: 1.2, margin: 0,
              }}>{pageTitle}</h1>
            </motion.div>

            <motion.div
              key={currentPage + "-content"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PageComponent />
            </motion.div>
          </main>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
