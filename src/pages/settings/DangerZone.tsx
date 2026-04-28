import { useState } from "react";
import { Trash2, AlertTriangle, RotateCcw, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
import { supabase } from "@/lib/supabase";
import { SettingsPageHeader, SettingsCard } from "@/components/settings";

const FINANCE_TABLES = [
  "income_categories",
  "expense_categories",
  "subscription_categories",
  "payment_methods",
  "recurrence_rules",
  "tax_rates",
  "finance_transaction_categories",
] as const;

const SETTINGS_TABLES = [
  "portal_profiles",
  "appearance_settings",
  "currency_settings",
] as const;

async function deletePortalRows(tables: readonly string[], portalId: string) {
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("portal_id", portalId);
    if (error) return error.message;
  }
  return null;
}

export default function DangerZone() {
  const { user } = useAuth();
  const { currentPortal, currentPortalId, isOwner, refreshPortals } = usePortalDB();
  const portalName = currentPortal?.name ?? "portale";

  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);

  function openConfirm(actionKey: string) {
    setActiveAction(actionKey);
    setConfirmText("");
  }

  async function executeAction() {
    if (!currentPortalId || confirmText !== portalName) return;
    setRunning(true);

    if (activeAction === "finance") {
      const err = await deletePortalRows(FINANCE_TABLES, currentPortalId);
      if (err) { toast.error(err); } else { toast.success("Dati finanziari resettati"); }
    }

    if (activeAction === "settings") {
      const err = await deletePortalRows(SETTINGS_TABLES, currentPortalId);
      if (err) { toast.error(err); } else { toast.success("Impostazioni ripristinate"); }
    }

    if (activeAction === "portal") {
      if (!isOwner) { toast.error("Solo il proprietario può eliminare il portale"); setRunning(false); return; }
      const { error } = await supabase
        .from("portals")
        .delete()
        .eq("id", currentPortalId)
        .eq("owner_id", user?.id ?? "");
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Portale eliminato");
        await refreshPortals();
      }
    }

    setRunning(false);
    setActiveAction(null);
  }

  const actions = [
    {
      key: "finance",
      title: "Reset Dati Finanziari",
      description: "Elimina tutte le categorie, metodi di pagamento e regole ricorrenza del portale",
      buttonLabel: "Reset Finanza",
      icon: RotateCcw,
      ownerOnly: false,
    },
    {
      key: "settings",
      title: "Reset Impostazioni",
      description: "Ripristina profilo portale, aspetto e valute ai valori predefiniti",
      buttonLabel: "Reset Impostazioni",
      icon: Settings,
      ownerOnly: false,
    },
    {
      key: "portal",
      title: "Elimina Portale",
      description: "Elimina permanentemente il portale e tutti i dati associati. Azione irreversibile.",
      buttonLabel: "Elimina Portale",
      icon: Trash2,
      ownerOnly: true,
    },
  ];

  return (
    <>
      <SettingsPageHeader
        icon={Trash2}
        title="Zona Pericolosa"
        description="Azioni irreversibili — procedi con cautela"
      />

      <SettingsCard danger>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {actions.map((action, i) => {
            if (action.ownerOnly && !isOwner) return null;
            return (
              <div
                key={action.key}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "16px 0",
                  borderBottom: i < actions.length - 1 ? "1px solid rgba(239, 68, 68, 0.08)" : "none",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <action.icon style={{ width: 16, height: 16, color: "var(--color-error)" }} />
                    <h4 style={{
                      fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                      color: "var(--text-primary)", margin: 0,
                    }}>
                      {action.title}
                    </h4>
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: 12,
                    color: "var(--text-tertiary)", marginTop: 4, marginBottom: 0,
                  }}>
                    {action.description}
                  </p>
                </div>
                <button
                  onClick={() => openConfirm(action.key)}
                  style={{
                    marginLeft: 24,
                    background: action.key === "portal" ? "var(--color-error)" : "transparent",
                    color: action.key === "portal" ? "#fff" : "var(--color-error)",
                    border: action.key === "portal" ? "none" : "1px solid var(--color-error)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 16px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {action.buttonLabel}
                </button>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* Type-to-confirm modal */}
      {activeAction && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            onClick={() => !running && setActiveAction(null)}
            style={{
              position: "absolute", inset: 0,
              background: "var(--modal-overlay)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />
          <div style={{
            position: "relative", zIndex: 1, width: "90%", maxWidth: 420,
            background: "var(--modal-bg, var(--bg-modal))",
            backdropFilter: "var(--glass-blur-heavy)",
            WebkitBackdropFilter: "var(--glass-blur-heavy)",
            border: "0.5px solid var(--modal-border, var(--border-glass))",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--modal-shadow, var(--shadow-modal))",
            padding: "32px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "var(--radius-lg)",
              background: "var(--color-error-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle style={{ width: 28, height: 28, color: "var(--color-error)" }} />
            </div>

            <h3 style={{
              fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600,
              color: "var(--text-primary)", marginBottom: 8,
            }}>
              {actions.find((a) => a.key === activeAction)?.title}
            </h3>

            <p style={{
              fontFamily: "var(--font-body)", fontSize: 13,
              color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16,
            }}>
              Digita <strong style={{ color: "var(--text-primary)" }}>"{portalName}"</strong> per confermare
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={portalName}
              className="glass-input"
              style={{ width: "100%", textAlign: "center", marginBottom: 20 }}
              disabled={running}
            />

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setActiveAction(null)}
                disabled={running}
                style={{
                  background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                  cursor: running ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)", opacity: running ? 0.5 : 1,
                }}
              >
                Annulla
              </button>
              <button
                disabled={confirmText !== portalName || running}
                onClick={executeAction}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--color-error)", border: "none",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: confirmText === portalName && !running ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  opacity: confirmText === portalName && !running ? 1 : 0.4,
                }}
              >
                {running && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
