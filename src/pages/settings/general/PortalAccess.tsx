import { useState } from "react";
import { Lock, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { usePortalSecurity, sha256hex } from "@/hooks/settings";
import { SettingsPageHeader, SettingsCard, SettingsFormField, SettingsToggle } from "@/components/settings";

export default function PortalAccess() {
  const { data, loading, upsert } = usePortalSecurity();

  const [enabled, setEnabled]           = useState<boolean | null>(null);
  const [newPassword, setNewPassword]   = useState("");
  const [confirmPassword, setConfirm]   = useState("");
  const [saving, setSaving]             = useState(false);

  const isEnabled     = enabled ?? data?.is_enabled ?? false;
  const hasPassword   = !!data?.password_hash;

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    if (!val) {
      setSaving(true);
      const { error } = await upsert({ is_enabled: false });
      setSaving(false);
      if (error) { toast.error(error); setEnabled(null); }
      else toast.success("Accesso libero — nessuna password richiesta");
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword) { toast.error("Inserisci una password"); return; }
    if (newPassword !== confirmPassword) { toast.error("Le password non coincidono"); return; }
    if (newPassword.length < 4) { toast.error("Password troppo corta (min 4 caratteri)"); return; }
    setSaving(true);
    const hash = await sha256hex(newPassword);
    const { error } = await upsert({ is_enabled: true, password_hash: hash });
    setSaving(false);
    if (error) { toast.error(error); return; }
    setNewPassword("");
    setConfirm("");
    setEnabled(null);
    toast.success("Password impostata — portale protetto");
  };

  const handleRemove = async () => {
    setSaving(true);
    const { error } = await upsert({ is_enabled: false, password_hash: null });
    setSaving(false);
    if (error) { toast.error(error); return; }
    setEnabled(null);
    toast.success("Password rimossa");
  };

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={KeyRound}
        title="Accesso Vault"
        description="Imposta la password per la cartella bloccata del Vault. Chi vuole accedere ai file bloccati dovrà inserirla."
      />

      <SettingsCard
        title="Password cartella bloccata"
        description="La password protegge la sezione 'Locked Folder' del Vault. Senza di essa i file bloccati non sono visibili."
      >
        {loading ? (
          <div className="h-10 animate-pulse rounded bg-white/5" />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isEnabled ? (
                  <ShieldCheck className="w-5 h-5" style={{ color: "var(--color-success)" }} />
                ) : (
                  <ShieldOff className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} />
                )}
                <div>
                  <p className="text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
                    {isEnabled ? "Portale protetto" : "Portale libero"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>
                    {isEnabled ? "Password richiesta per accedere" : "Nessuna password richiesta"}
                  </p>
                </div>
              </div>
              <SettingsToggle checked={isEnabled} onChange={handleToggle} />
            </div>

            {isEnabled && (
              <div className="space-y-4 pt-2" style={{ borderTop: "1px solid var(--sosa-border)" }}>
                {hasPassword && (
                  <div className="flex items-center justify-between p-3" style={{ background: "var(--sosa-bg-3)", border: "1px solid var(--sosa-border)" }}>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" style={{ color: "var(--color-success)" }} />
                      <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        Password impostata
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={saving}
                      className="text-xs"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer" }}
                    >
                      Rimuovi
                    </button>
                  </div>
                )}

                <SettingsFormField label={hasPassword ? "Nuova password" : "Imposta password"}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </SettingsFormField>

                <SettingsFormField label="Conferma password">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                </SettingsFormField>

                <button
                  type="button"
                  onClick={handleSetPassword}
                  disabled={saving || !newPassword}
                  className="btn-primary w-full"
                >
                  {saving ? "Salvataggio..." : hasPassword ? "Cambia password" : "Imposta password"}
                </button>
              </div>
            )}
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
