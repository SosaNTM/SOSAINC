import { useState } from "react";
import { AlertTriangle, Plus, Bell, Mail, Send, Monitor } from "lucide-react";
import { toast } from "sonner";
import { useAlertRules } from "../../../hooks/settings";
import type { AlertRule } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm, SettingsToggle,
} from "@/components/settings";

type Priority = "info" | "warning" | "critical";

const TRIGGER_OPTIONS = [
  "Scadenza abbonamento", "Budget categoria", "Assegnazione task", "Scadenza task",
  "Commento task", "Pubblicazione social", "Errore social", "Pagamento ricevuto", "Obiettivo raggiunto",
];

const CHANNEL_OPTIONS = [
  { id: "in_app", label: "In-App", icon: Bell },
  { id: "email", label: "Email", icon: Mail },
  { id: "telegram", label: "Telegram", icon: Send },
  { id: "browser_push", label: "Browser Push", icon: Monitor },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  info:     { label: "Info",     color: "var(--color-info, #3b82f6)" },
  warning:  { label: "Warning",  color: "var(--color-warning, #f59e0b)" },
  critical: { label: "Critical", color: "var(--color-error, #ef4444)" },
};

interface FormState {
  name: string;
  trigger_type: string;
  condition: string;
  channels: string[];
  priority: Priority;
  isEnabled: boolean;
}

const emptyForm = (): FormState => ({
  name: "", trigger_type: TRIGGER_OPTIONS[0], condition: "",
  channels: ["in_app"], priority: "info", isEnabled: true,
});

export default function AlertRulesPage() {
  const { data: rules, loading, create, update, remove } = useAlertRules();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      trigger_type: rule.trigger_type,
      condition: (rule.conditions?.description as string) ?? "",
      channels: [...rule.channels],
      priority: rule.priority,
      isEnabled: rule.is_active,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name,
      trigger_type: form.trigger_type,
      conditions: { description: form.condition } as Record<string, unknown>,
      channels: form.channels,
      priority: form.priority,
      is_active: form.isEnabled,
    };
    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast.error(error); } else { toast.success("Regola aggiornata"); }
    } else {
      const { error } = await create(payload);
      if (error) { toast.error(error); } else { toast.success("Regola creata"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); } else { toast.success("Regola eliminata"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  async function toggleActive(rule: AlertRule) {
    const { error } = await update(rule.id, { is_active: !rule.is_active });
    if (error) { toast.error(error); }
  }

  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));
  }

  const columns = [
    {
      key: "name",
      label: "Nome",
      render: (item: AlertRule) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "trigger_type",
      label: "Trigger",
      render: (item: AlertRule) => (
        <span style={{
          fontSize: 11, color: "var(--text-secondary)",
          background: "var(--bg-card-inner)", borderRadius: 4,
          padding: "2px 6px",
        }}>
          {item.trigger_type}
        </span>
      ),
    },
    {
      key: "condition",
      label: "Condizione",
      render: (item: AlertRule) => (
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {(item.conditions?.description as string) ?? "—"}
        </span>
      ),
    },
    {
      key: "channels",
      label: "Canali",
      width: "120px",
      render: (item: AlertRule) => (
        <div style={{ display: "flex", gap: 4 }}>
          {item.channels.map((ch) => {
            const opt = CHANNEL_OPTIONS.find((o) => o.id === ch);
            if (!opt) return null;
            return (
              <span key={ch} style={{
                fontSize: 9, fontWeight: 600,
                background: "var(--accent-primary-soft)",
                color: "var(--accent-primary)",
                borderRadius: 3, padding: "1px 5px",
              }}>
                {opt.label}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      key: "status",
      label: "Stato",
      width: "70px",
      render: (item: AlertRule) => (
        <SettingsToggle
          checked={item.is_active}
          onChange={() => toggleActive(item)}
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={AlertTriangle}
        title="Regole di Avviso"
        description="Imposta notifiche automatiche"
        action={{ label: "Aggiungi Regola", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<AlertRule>
          columns={columns}
          data={rules}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuna regola di avviso."
          emptyIcon={AlertTriangle}
        />
      </SettingsCard>

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Regola" : "Nuova Regola"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required>
          <input className="glass-input" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome regola" />
        </SettingsFormField>

        <SettingsFormField label="Evento trigger">
          <select className="glass-input" value={form.trigger_type}
            onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}>
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </SettingsFormField>

        <SettingsFormField label="Condizione">
          <input className="glass-input" value={form.condition}
            onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
            placeholder="Es. 7 giorni prima" />
        </SettingsFormField>

        <SettingsFormField label="Canali">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHANNEL_OPTIONS.map((ch) => {
              const active = form.channels.includes(ch.id);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: "var(--radius-md)",
                    border: `1px solid ${active ? "var(--accent-primary)" : "var(--glass-border)"}`,
                    background: active ? "var(--accent-primary-soft)" : "var(--glass-bg)",
                    color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                    cursor: "pointer", fontSize: 12, fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    transition: "all 0.15s",
                  }}
                >
                  <ch.icon style={{ width: 13, height: 13 }} />
                  {ch.label}
                </button>
              );
            })}
          </div>
        </SettingsFormField>

        <SettingsFormField label="Priorita">
          <div style={{ display: "flex", gap: 6 }}>
            {(["info", "warning", "critical"] as Priority[]).map((p) => {
              const pc = PRIORITY_CONFIG[p];
              const active = form.priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  style={{
                    flex: 1, padding: "7px", borderRadius: "var(--radius-md)",
                    border: `1px solid ${active ? pc.color : "var(--glass-border)"}`,
                    background: active ? `${pc.color}18` : "var(--glass-bg)",
                    color: active ? pc.color : "var(--text-secondary)",
                    cursor: "pointer", fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    fontFamily: "var(--font-body)",
                    transition: "all 0.15s",
                    textAlign: "center",
                  }}
                >
                  {pc.label}
                </button>
              );
            })}
          </div>
        </SettingsFormField>

        <SettingsFormField label="Attiva">
          <SettingsToggle
            checked={form.isEnabled}
            onChange={(v) => setForm((f) => ({ ...f, isEnabled: v }))}
            label="Regola attiva"
          />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Regola"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
