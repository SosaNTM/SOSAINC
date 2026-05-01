import { useState } from "react";
import { Trash2, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { usePortalDB } from "@/lib/portalContextDB";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase as _supabase } from "@/lib/supabase";
const supabase = _supabase as any;
import { SettingsPageHeader, SettingsCard } from "@/components/settings";

type ActionKey = "reset" | "delete";

const ACTIONS: {
  key: ActionKey;
  title: string;
  description: string;
  buttonLabel: string;
  icon: React.ElementType;
  confirmLabel: string;
}[] = [
  {
    key: "reset",
    title: "Reset Dati Portale",
    description:
      "Elimina tutti i dati operativi: transazioni, inventario, vault, crypto, abbonamenti, gift card, account social. La configurazione (categorie, metodi pagamento, impostazioni) viene preservata.",
    buttonLabel: "Reset Dati",
    icon: RotateCcw,
    confirmLabel: "Elimina dati",
  },
  {
    key: "delete",
    title: "Elimina Portale",
    description:
      "Elimina permanentemente il portale e tutti i dati associati. Tutti i membri perderanno accesso. Azione irreversibile.",
    buttonLabel: "Elimina Portale",
    icon: Trash2,
    confirmLabel: "Elimina portale",
  },
];

export default function DangerZone() {
  const { user } = useAuth();
  const { currentPortal, currentPortalId, isOwner, refreshPortals } = usePortalDB();
  const navigate = useNavigate();
  const portalName = currentPortal?.name ?? "";
  const portalSlug = (currentPortal as any)?.slug ?? "";

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [running, setRunning] = useState(false);

  if (!isOwner) return null;

  function openConfirm(key: ActionKey) {
    setActiveAction(key);
    setConfirmText("");
  }

  function closeConfirm() {
    if (running) return;
    setActiveAction(null);
    setConfirmText("");
  }

  async function executeAction() {
    if (!currentPortalId || !user || confirmText !== portalName) return;
    setRunning(true);

    try {
      if (activeAction === "reset") {
        const { data, error } = await supabase.rpc("reset_portal_data", {
          p_portal_id: currentPortalId,
        });
        if (error) throw new Error(error.message);
        const deleted = (data as any)?.deleted ?? {};
        const totalDeleted = Object.values(deleted).reduce(
          (sum: number, n: unknown) => sum + (Number(n) || 0),
          0,
        );
        toast.success(`Portale resettato — ${totalDeleted} record eliminati`);
        navigate(`/${portalSlug}/dashboard`);
      }

      if (activeAction === "delete") {
        const { error } = await supabase
          .from("portals")
          .delete()
          .eq("id", currentPortalId)
          .eq("owner_id", user.id);
        if (error) throw new Error(error.message);
        toast.success("Portale eliminato");
        await refreshPortals();
        navigate("/hub");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'operazione");
    } finally {
      setRunning(false);
      setActiveAction(null);
    }
  }

  const activeConfig = ACTIONS.find((a) => a.key === activeAction);

  return (
    <>
      <SettingsPageHeader
        icon={Trash2}
        title="Zona Pericolosa"
        description="Azioni irreversibili — procedi con cautela"
      />

      <SettingsCard danger>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {ACTIONS.map((action, i) => (
            <div
              key={action.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
                borderBottom:
                  i < ACTIONS.length - 1
                    ? "1px solid rgba(239,68,68,0.08)"
                    : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <action.icon
                    style={{ width: 15, height: 15, color: "var(--color-error)", flexShrink: 0 }}
                  />
                  <h4
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      margin: 0,
                    }}
                  >
                    {action.title}
                  </h4>
                </div>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    color: "var(--text-tertiary)",
                    marginTop: 4,
                    marginBottom: 0,
                    lineHeight: 1.5,
                    maxWidth: 480,
                  }}
                >
                  {action.description}
                </p>
              </div>

              <button
                onClick={() => openConfirm(action.key)}
                style={{
                  marginLeft: 24,
                  flexShrink: 0,
                  background:
                    action.key === "delete" ? "var(--color-error)" : "transparent",
                  color:
                    action.key === "delete" ? "#fff" : "var(--color-error)",
                  border:
                    action.key === "delete"
                      ? "none"
                      : "1px solid var(--color-error)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                }}
              >
                {action.buttonLabel}
              </button>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Confirm modal */}
      {activeAction && activeConfig && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Overlay */}
          <div
            onClick={closeConfirm}
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--modal-overlay, rgba(0,0,0,0.6))",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Panel */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "90%",
              maxWidth: 420,
              background: "var(--modal-bg, var(--bg-modal, #111))",
              backdropFilter: "var(--glass-blur-heavy)",
              WebkitBackdropFilter: "var(--glass-blur-heavy)",
              border: "0.5px solid var(--modal-border, var(--border-glass))",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--modal-shadow, var(--shadow-modal))",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: "rgba(239,68,68,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <AlertTriangle
                style={{ width: 28, height: 28, color: "var(--color-error)" }}
              />
            </div>

            <h3
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              {activeConfig.title}
            </h3>

            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              Digita{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                "{portalName}"
              </strong>{" "}
              per confermare
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={portalName}
              className="glass-input"
              style={{ width: "100%", textAlign: "center", marginBottom: 20 }}
              disabled={running}
              autoFocus
            />

            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
              }}
            >
              <button
                onClick={closeConfirm}
                disabled={running}
                style={{
                  background: "var(--glass-bg)",
                  border: "0.5px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  cursor: running ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)",
                  opacity: running ? 0.5 : 1,
                }}
              >
                Annulla
              </button>

              <button
                disabled={confirmText !== portalName || running}
                onClick={executeAction}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--color-error)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  cursor:
                    confirmText === portalName && !running
                      ? "pointer"
                      : "not-allowed",
                  fontFamily: "var(--font-body)",
                  opacity: confirmText === portalName && !running ? 1 : 0.4,
                  transition: "opacity 0.15s",
                }}
              >
                {running && (
                  <Loader2
                    size={14}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {activeConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
