import { useState } from "react";
import { UserPlus, Trash2, ShieldCheck, Shield, Eye, User } from "lucide-react";
import { toast } from "sonner";
import { usePortalMembers, type PortalRole } from "@/hooks/usePortalMembers";
import { usePortalDB } from "@/lib/portalContextDB";
import { useAuth } from "@/lib/authContext";
import {
  SettingsPageHeader,
  SettingsCard,
  SettingsFormField,
  SettingsDeleteConfirm,
} from "@/components/settings";

const ROLE_OPTIONS: { value: PortalRole; label: string; icon: React.FC<{ style?: React.CSSProperties }> }[] = [
  { value: "admin",  label: "Admin",  icon: ShieldCheck },
  { value: "member", label: "Member", icon: Shield },
  { value: "viewer", label: "Viewer", icon: Eye },
];

function roleIcon(role: string) {
  if (role === "owner")  return <ShieldCheck style={{ width: 14, height: 14, color: "var(--accent-primary)" }} />;
  if (role === "admin")  return <ShieldCheck style={{ width: 14, height: 14, color: "var(--color-success)" }} />;
  if (role === "viewer") return <Eye         style={{ width: 14, height: 14, color: "var(--text-tertiary)" }} />;
  return <Shield style={{ width: 14, height: 14, color: "var(--text-secondary)" }} />;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: 32, height: 32, borderRadius: 0, objectFit: "cover", border: "1px solid var(--glass-border)" }} />;
  }
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <div style={{
      width: 32, height: 32, background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
      color: "var(--accent-primary)",
    }}>
      {initials}
    </div>
  );
}

export default function Members() {
  const { user } = useAuth();
  const { userRole } = usePortalDB();
  const { members, loading, invite, changeRole, removeMember } = usePortalMembers();

  const [inviteEmail, setInviteEmail]   = useState("");
  const [inviteRole, setInviteRole]     = useState<PortalRole>("member");
  const [inviting, setInviting]         = useState(false);
  const [inviteError, setInviteError]   = useState("");

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError("Inserisci un'email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setInviteError("Email non valida"); return; }
    setInviteError("");
    setInviting(true);
    const { error } = await invite(inviteEmail.trim().toLowerCase(), inviteRole);
    setInviting(false);
    if (error) { toast.error(error); return; }
    toast.success(`Invito inviato a ${inviteEmail}`);
    setInviteEmail("");
  };

  const handleRoleChange = async (userId: string, role: PortalRole) => {
    const { error } = await changeRole(userId, role);
    if (error) toast.error(error);
    else toast.success("Ruolo aggiornato");
  };

  const handleRemove = async (userId: string) => {
    const { error } = await removeMember(userId);
    setConfirmRemove(null);
    if (error) toast.error(error);
    else toast.success("Membro rimosso");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SettingsPageHeader title="Membri del portale" />

      {/* Invite form — admins/owners only */}
      {isOwnerOrAdmin && (
        <SettingsCard title="Invita utente" description="L'utente riceverà un'email con un link per impostare la password e accedere al portale.">
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px" }}>
              <SettingsFormField label="Email" error={inviteError}>
                <input
                  className="glass-input"
                  type="email"
                  placeholder="nome@esempio.com"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleInvite(); }}
                  disabled={inviting}
                  style={{ width: "100%" }}
                />
              </SettingsFormField>
            </div>

            <div style={{ flex: "0 0 auto" }}>
              <SettingsFormField label="Ruolo">
                <select
                  className="glass-input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as PortalRole)}
                  disabled={inviting}
                  style={{ minWidth: 120 }}
                >
                  {ROLE_OPTIONS
                    .filter((r) => userRole === "owner" || r.value !== "admin")
                    .map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                </select>
              </SettingsFormField>
            </div>

            <button
              className="btn-primary"
              onClick={() => void handleInvite()}
              disabled={inviting || !inviteEmail}
              style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}
            >
              <UserPlus style={{ width: 14, height: 14 }} />
              {inviting ? "Invio..." : "Invita"}
            </button>
          </div>
        </SettingsCard>
      )}

      {/* Member list */}
      <SettingsCard title="Membri attuali" description={`${members.length} membro${members.length !== 1 ? "i" : ""} in questo portale`}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 52, background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-md)",
                animation: "pulse 1.5s infinite",
              }} />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <User style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.3 }} />
            Nessun membro trovato
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {members.map((member) => {
              const isSelf  = member.user_id === user?.id;
              const isOwner = member.role === "owner";
              const canEdit = isOwnerOrAdmin && !isOwner && !isSelf;

              return (
                <div key={member.user_id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px",
                  background: "var(--glass-bg)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-md)",
                }}>
                  <Avatar name={member.display_name} url={member.avatar_url} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {member.display_name}
                      {isSelf && <span style={{ color: "var(--text-tertiary)", fontWeight: 400, marginLeft: 6 }}>(tu)</span>}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 11,
                      color: "var(--text-tertiary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {member.email}
                    </div>
                  </div>

                  {/* Role badge / selector */}
                  {canEdit ? (
                    <select
                      className="glass-input"
                      value={member.role}
                      onChange={(e) => void handleRoleChange(member.user_id, e.target.value as PortalRole)}
                      style={{ fontSize: 11, padding: "4px 8px", minWidth: 100 }}
                    >
                      {ROLE_OPTIONS
                        .filter((r) => userRole === "owner" || r.value !== "admin")
                        .map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                  ) : (
                    <span style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontFamily: "var(--font-mono)", fontSize: 11,
                      color: "var(--text-secondary)", textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}>
                      {roleIcon(member.role)}
                      {member.role}
                    </span>
                  )}

                  {/* Remove button */}
                  {canEdit && (
                    <button
                      onClick={() => setConfirmRemove(member.user_id)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-tertiary)", padding: 4,
                        display: "flex", alignItems: "center",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                      title="Rimuovi membro"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SettingsCard>

      {/* Remove confirmation modal */}
      <SettingsDeleteConfirm
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && void handleRemove(confirmRemove)}
        title="Rimuovi membro"
        message={`Rimuovere ${members.find((m) => m.user_id === confirmRemove)?.display_name ?? "questo utente"} dal portale? Perderà l'accesso immediatamente.`}
      />
    </div>
  );
}
