import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Loader2, Search, Users, BarChart2 } from "lucide-react";
import { useLeadgenMembers, type LeadgenMemberWithProfile } from "@/hooks/leadgen/useLeadgenMembers";
import type { LeadgenMemberRole, LeadgenMemberTeam } from "@/types/leadgen";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--text-tertiary)", display: "block", marginBottom: 6,
};

function RoleSelect({ value, onChange }: { value: LeadgenMemberRole; onChange: (v: LeadgenMemberRole) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["owner", "admin", "sales"] as const).map((r) => (
        <button key={r} type="button" onClick={() => onChange(r)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 10px", border: `1px solid ${value === r ? "var(--accent-primary)" : "var(--glass-border)"}`, background: value === r ? "var(--accent-primary)" : "transparent", color: value === r ? "var(--sosa-bg)" : "var(--text-secondary)", cursor: "pointer", textTransform: "capitalize" }}>
          {r}
        </button>
      ))}
    </div>
  );
}

function TeamSelect({ value, onChange }: { value: LeadgenMemberTeam; onChange: (v: LeadgenMemberTeam) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {(["internal", "external"] as const).map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)}
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 10px", border: `1px solid ${value === t ? "var(--accent-primary)" : "var(--glass-border)"}`, background: value === t ? "var(--accent-primary)" : "transparent", color: value === t ? "var(--sosa-bg)" : "var(--text-secondary)", cursor: "pointer", textTransform: "capitalize" }}>
          {t === "internal" ? "Interno" : "Esterno"}
        </button>
      ))}
    </div>
  );
}

// ── Add modal ─────────────────────────────────────────────────────────────────

function AddMemberModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { searchByEmail, addMember, members } = useLeadgenMembers();
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<{ user_id: string; display_name: string | null; email: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [role, setRole] = useState<LeadgenMemberRole>("sales");
  const [team, setTeam] = useState<LeadgenMemberTeam>("internal");
  const [saving, setSaving] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!email.trim()) return;
    setSearching(true);
    setFound(null);
    setNotFound(false);
    const result = await searchByEmail(email.trim());
    setSearching(false);
    if (!result) { setNotFound(true); return; }
    // Check not already a member
    const alreadyMember = members.some((m) => m.user_id === result.user_id);
    if (alreadyMember) { toast.error("Questo utente è già nel team"); return; }
    setFound(result);
  }, [email, searchByEmail, members]);

  const handleAdd = useCallback(async () => {
    if (!found) return;
    setSaving(true);
    const { error } = await addMember({ user_id: found.user_id, role, team, display_name: found.display_name ?? undefined });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success(`${found.display_name ?? found.email} aggiunto al team`);
    onAdded();
    onClose();
  }, [found, role, team, addMember, onAdded, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)", width: "100%", maxWidth: 440, padding: 28 }}
        onClick={(e) => e.stopPropagation()}>
        <p style={{ ...MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>Lead Generation</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 24 }}>Aggiungi membro al team</h2>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Email utente SOSA</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              className="glass-input" style={{ flex: 1 }} placeholder="mario@example.com"
            />
            <button type="button" onClick={handleSearch} disabled={searching || !email.trim()} className="btn-glass-ds"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              {searching ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={12} />}
              Cerca
            </button>
          </div>
        </div>

        {notFound && (
          <div style={{ ...MONO, fontSize: 12, color: "var(--color-error)", marginBottom: 16 }}>
            Nessun utente con questa email. L'utente deve registrarsi su SOSA prima di essere aggiunto.
          </div>
        )}

        {found && (
          <>
            <div style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--color-success) 10%, transparent)", border: "1px solid var(--color-success)", marginBottom: 20, ...MONO, fontSize: 12, color: "var(--color-success)" }}>
              ✓ Trovato: {found.email}{found.display_name ? ` (${found.display_name})` : ""}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Ruolo</label>
              <RoleSelect value={role} onChange={setRole} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Team</label>
              <TeamSelect value={team} onChange={setTeam} />
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} className="btn-glass-ds">Annulla</button>
          {found && (
            <button type="button" onClick={handleAdd} disabled={saving} className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Aggiungi al team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditMemberModal({ member, onClose, onSaved }: {
  member: LeadgenMemberWithProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { updateMember, deactivateMember, members, currentMember } = useLeadgenMembers();
  const [role, setRole] = useState<LeadgenMemberRole>(member.role);
  const [team, setTeam] = useState<LeadgenMemberTeam>(member.team);
  const [displayName, setDisplayName] = useState(member.display_name ?? "");
  const [notes, setNotes] = useState(member.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const isLastOwner = member.role === "owner" && members.filter((m) => m.role === "owner" && m.active).length <= 1;
  const isSelf = currentMember?.id === member.id;

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await updateMember(member.id, {
      role, team,
      display_name: displayName.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error); return; }
    toast.success("Membro aggiornato");
    onSaved();
    onClose();
  }, [member.id, role, team, displayName, notes, updateMember, onSaved, onClose]);

  const handleDeactivate = useCallback(async () => {
    if (isSelf) { toast.error("Non puoi disattivare te stesso"); return; }
    if (isLastOwner) { toast.error("Non puoi rimuovere l'unico owner. Cedi il ruolo a un altro membro prima."); return; }
    setDeactivating(true);
    const { error } = await deactivateMember(member.id);
    setDeactivating(false);
    if (error) { toast.error(error); return; }
    toast.success(`${member.display_name ?? member.email} disattivato`);
    onSaved();
    onClose();
  }, [isSelf, isLastOwner, member.id, member.display_name, member.email, deactivateMember, onSaved, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}>
      <div style={{ background: "var(--sosa-bg)", border: "1.5px solid var(--glass-border)", width: "100%", maxWidth: 440, padding: 28 }}
        onClick={(e) => e.stopPropagation()}>
        <p style={{ ...MONO, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>Modifica membro</p>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          {member.display_name ?? member.email}
        </h2>
        <p style={{ ...MONO, fontSize: 11, color: "var(--text-tertiary)", marginBottom: 24 }}>{member.email}</p>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Display name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            className="glass-input" style={{ width: "100%" }} placeholder={member.email} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Ruolo</label>
          {isLastOwner && role === "owner" ? (
            <p style={{ ...MONO, fontSize: 11, color: "var(--text-tertiary)" }}>Unico owner — non è possibile declassare</p>
          ) : (
            <RoleSelect value={role} onChange={setRole} />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Team</label>
          <TeamSelect value={team} onChange={setTeam} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Note interne</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="glass-input" style={{ width: "100%", minHeight: 70, resize: "vertical" }}
            placeholder="Visibili solo agli admin" />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button type="button" onClick={handleDeactivate} disabled={deactivating || isSelf || isLastOwner}
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "7px 14px", border: "1px solid var(--color-error)", background: "transparent", color: "var(--color-error)", cursor: (isSelf || isLastOwner) ? "not-allowed" : "pointer", opacity: (isSelf || isLastOwner) ? 0.4 : 1 }}>
            {deactivating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite", display: "inline" }} /> : "Disattiva"}
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-glass-ds">Annulla</button>
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workload bar ──────────────────────────────────────────────────────────────

function WorkloadBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ width: 120, height: 4, background: "var(--glass-border)", flexShrink: 0 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent-primary)", transition: "width 0.3s" }} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamManagement() {
  const { members, workload, poolCount, loading, refetch } = useLeadgenMembers();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<LeadgenMemberWithProfile | null>(null);

  const activeMembers = members.filter((m) => m.active);
  const maxWorkload = Math.max(1, ...Array.from(workload.values()).map((w) => w.total));

  const handleMemberAdded = useCallback(() => {
    setShowAdd(false);
    refetch();
  }, [refetch]);

  if (loading) {
    return <div style={{ padding: 32, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>Caricamento...</div>;
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Team Lead Generation
          </h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
            Gestisci ruoli e visibilità per il modulo lead generation.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
          <Plus size={13} /> Aggiungi
        </button>
      </div>

      {/* Members section */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Users size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
            Membri ({activeMembers.length})
          </span>
        </div>

        <div style={{ border: "0.5px solid var(--glass-border)" }}>
          {activeMembers.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>
              Nessun membro. Aggiungi qualcuno con il bottone in alto.
            </div>
          )}
          {activeMembers.map((member, i) => (
            <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderTop: i > 0 ? "0.5px solid var(--glass-border)" : "none" }}>
              <div style={{ width: 32, height: 32, background: "var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-secondary)" }}>
                  {(member.display_name ?? member.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  {member.display_name ?? member.email}
                  {member.team === "external" && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", marginLeft: 6 }}>(est.)</span>}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", margin: 0 }}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)} · {member.team === "internal" ? "Interno" : "Esterno"}
                </p>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 8px", border: "1px solid var(--glass-border)", color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                Attivo
              </span>
              <button onClick={() => setEditing(member)} className="btn-glass-ds"
                style={{ fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                Modifica
              </button>
            </div>
          ))}
        </div>

        {/* Inactive members */}
        {members.filter((m) => !m.active).length > 0 && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 10 }}>
            {members.filter((m) => !m.active).length} membri disattivati nascosti.
          </p>
        )}
      </div>

      {/* Workload section */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BarChart2 size={14} style={{ color: "var(--text-tertiary)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>
            Carico di lavoro
          </span>
        </div>

        <div style={{ border: "0.5px solid var(--glass-border)" }}>
          {activeMembers.map((member, i) => {
            const w = workload.get(member.user_id) ?? { total: 0, active: 0 };
            return (
              <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: i > 0 ? "0.5px solid var(--glass-border)" : "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", width: 140, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {member.display_name ?? member.email}
                </span>
                <WorkloadBar value={w.total} max={maxWorkload} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
                  {w.total} lead ({w.active} attivi)
                </span>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderTop: "0.5px solid var(--glass-border)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", width: 140, flexShrink: 0 }}>Pool</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
              {poolCount} lead non assegnati
            </span>
          </div>
        </div>
      </div>

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onAdded={handleMemberAdded} />}
      {editing && <EditMemberModal member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}
    </div>
  );
}
