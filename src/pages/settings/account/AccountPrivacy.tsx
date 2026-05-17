import { useState } from "react";
import { Download, Trash2, AlertTriangle, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/authContext";
import { exportUserData, deleteAccount } from "@/lib/services/gdprService";
import { supabase } from "@/lib/supabase";
import { SettingsPageHeader, SettingsCard } from "@/components/settings";

export default function AccountPrivacy() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportUserData();
      toast.success("Dati esportati con successo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'esportazione");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!user || confirmEmail !== user.email) return;
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success("Account eliminato");
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione");
      setDeleting(false);
    }
  }

  return (
    <>
      <SettingsPageHeader
        icon={Shield}
        title="Privacy e Account"
        description="Gestisci i tuoi dati personali e l'accesso al tuo account"
      />

      <SettingsCard title="Esporta i miei dati" description="Scarica una copia JSON di tutti i tuoi dati (GDPR Art. 20).">
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
            borderRadius: "var(--radius-md)", padding: "8px 16px",
            fontSize: 13, fontWeight: 500, color: "var(--text-primary)",
            cursor: exporting ? "not-allowed" : "pointer", opacity: exporting ? 0.6 : 1,
            fontFamily: "var(--font-body)",
          }}
        >
          {exporting
            ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            : <Download size={14} />}
          {exporting ? "Esportazione..." : "Esporta dati"}
        </button>
      </SettingsCard>

      <SettingsCard
        title="Elimina account"
        description="Rimuove permanentemente il tuo account e tutti i dati personali da tutti i portali. Azione irreversibile."
        danger
      >
        <button
          onClick={() => { setShowDeleteModal(true); setConfirmEmail(""); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "var(--color-error)", border: "none",
            borderRadius: "var(--radius-md)", padding: "8px 16px",
            fontSize: 13, fontWeight: 600, color: "#fff",
            cursor: "pointer", fontFamily: "var(--font-body)",
          }}
        >
          <Trash2 size={14} />
          Elimina account
        </button>
      </SettingsCard>

      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            onClick={() => { if (!deleting) setShowDeleteModal(false); }}
            style={{ position: "absolute", inset: 0, background: "var(--modal-overlay, rgba(0,0,0,0.6))", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          />
          <div style={{
            position: "relative", zIndex: 1, width: "90%", maxWidth: 420,
            background: "var(--modal-bg, var(--bg-modal, #111))",
            backdropFilter: "var(--glass-blur-heavy)", WebkitBackdropFilter: "var(--glass-blur-heavy)",
            border: "0.5px solid var(--modal-border, var(--border-glass))",
            borderRadius: "var(--radius-xl)",
            boxShadow: "var(--modal-shadow, var(--shadow-modal))",
            padding: "32px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "var(--radius-lg)",
              background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px",
            }}>
              <AlertTriangle style={{ width: 28, height: 28, color: "var(--color-error)" }} />
            </div>

            <h3 style={{ fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Elimina il tuo account
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
              Digita <strong style={{ color: "var(--text-primary)" }}>"{user?.email}"</strong> per confermare
            </p>

            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={user?.email ?? ""}
              className="glass-input"
              style={{ width: "100%", textAlign: "center", marginBottom: 20 }}
              disabled={deleting}
              autoFocus
            />

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  background: "var(--glass-bg)", border: "0.5px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-body)", opacity: deleting ? 0.5 : 1,
                }}
              >
                Annulla
              </button>
              <button
                disabled={confirmEmail !== user?.email || deleting}
                onClick={handleDelete}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--color-error)", border: "none",
                  borderRadius: "var(--radius-md)", padding: "8px 20px",
                  fontSize: 13, fontWeight: 600, color: "#fff",
                  cursor: confirmEmail === user?.email && !deleting ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-body)",
                  opacity: confirmEmail === user?.email && !deleting ? 1 : 0.4,
                  transition: "opacity 0.15s",
                }}
              >
                {deleting && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                Elimina account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
