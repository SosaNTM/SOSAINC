import { useState } from "react";
import { Trash2, AlertTriangle, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import { usePortal } from "@/lib/portalContext";
import { STORAGE_PERSONAL_TX_PREFIX, STORAGE_FINANCE_CATEGORIES_PREFIX } from "@/constants/storageKeys";
import { SettingsPageHeader, SettingsCard } from "@/components/settings";
import { SettingsDeleteConfirm } from "@/components/settings/SettingsDeleteConfirm";

interface DangerAction {
  title: string;
  description: string;
  buttonLabel: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
  onConfirm: () => void;
}

export default function DangerZone() {
  const { user } = useAuth();
  const { portal } = usePortal();
  const [confirmAction, setConfirmAction] = useState<DangerAction | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const portalName = portal?.name ?? "portale";
  const isOwner = user?.role === "owner";

  const actions: DangerAction[] = [
    {
      title: "Reset Dati Finanziari",
      description: "Elimina tutte le transazioni, budget e obiettivi del portale",
      buttonLabel: "Reset Finanza",
      icon: RotateCcw,
      onConfirm: () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`${STORAGE_PERSONAL_TX_PREFIX}_`) ||
          k.startsWith("finance_") ||
          k.startsWith("investments_")
        );
        keys.forEach(k => localStorage.removeItem(k));
        toast.success("Dati finanziari resettati");
      },
    },
    {
      title: "Reset Impostazioni",
      description: "Ripristina tutte le impostazioni ai valori predefiniti",
      buttonLabel: "Reset Impostazioni",
      icon: Settings,
      onConfirm: () => {
        const keys = Object.keys(localStorage).filter(k =>
          k.startsWith(`${STORAGE_FINANCE_CATEGORIES_PREFIX}_`) ||
          k.startsWith("portal_profile_")
        );
        keys.forEach(k => localStorage.removeItem(k));
        toast.success("Impostazioni ripristinate");
      },
    },
    {
      title: "Elimina Portale",
      description: "Elimina permanentemente il portale e tutti i dati associati",
      buttonLabel: "Elimina Portale",
      icon: Trash2,
      ownerOnly: true,
      onConfirm: () => {
        toast.success("Portale eliminato (simulazione)");
      },
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
          {actions.map((action) => {
            if (action.ownerOnly && !isOwner) return null;
            return (
              <div key={action.title} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 0",
                borderBottom: "1px solid rgba(239, 68, 68, 0.08)",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <action.icon style={{ width: 16, height: 16, color: "var(--color-error)" }} />
                    <h4 style={{
                      fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
                      color: "var(--text-primary)", margin: 0,
                    }}>{action.title}</h4>
                  </div>
                  <p style={{
                    fontFamily: "var(--font-body)", fontSize: 12,
                    color: "var(--text-tertiary)", marginTop: 4,
                  }}>{action.description}</p>
                </div>
                <button
                  onClick={() => { setConfirmAction(action); setConfirmText(""); }}
                  style={{
                    background: action.title === "Elimina Portale"
                      ? "var(--color-error)" : "transparent",
                    color: action.title === "Elimina Portale"
                      ? "#fff" : "var(--color-error)",
                    border: action.title === "Elimina Portale"
                      ? "none" : "1px solid var(--color-error)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 16px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                  }}
                >{action.buttonLabel}</button>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* Confirm Modal with type-to-confirm */}
      {confirmAction && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 110,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div
            onClick={() => setConfirmAction(null)}
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
            }}>{confirmAction.title}</h3>

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
            />

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setConfirmAction(null)}
                style={{
                  background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "var(--font-body)",
                }}
              >Annulla</button>
              <button
                disabled={confirmText !== portalName}
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                style={{
                  background: "var(--color-error)", border: "none",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: confirmText === portalName ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  opacity: confirmText === portalName ? 1 : 0.4,
                }}
              >Conferma Eliminazione</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
