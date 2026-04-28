import { useState } from "react";
import { Tags, Plus, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useTaskPriorities, useTaskLabels } from "../../../hooks/settings";
import type { TaskPriority, TaskLabel } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsColorPicker,
} from "@/components/settings";

/* ── Priority form ──────────────────────────────────────────────────── */
interface PriorityForm { name: string; color: string; order: number; }
const emptyPriorityForm = (): PriorityForm => ({ name: "", color: "#3b82f6", order: 0 });

/* ── Label form ─────────────────────────────────────────────────────── */
interface LabelForm { name: string; color: string; }
const emptyLabelForm = (): LabelForm => ({ name: "", color: "#8b5cf6" });

export default function PrioritiesLabels() {
  const { data: priorities, loading: pLoading, create: createP, update: updateP, remove: removeP } = useTaskPriorities();
  const { data: labels, loading: lLoading, create: createL, update: updateL, remove: removeL } = useTaskLabels();

  /* Priority state */
  const [pModalOpen, setPModalOpen] = useState(false);
  const [pEditingId, setPEditingId] = useState<string | null>(null);
  const [pForm, setPForm] = useState<PriorityForm>(emptyPriorityForm());
  const [pErrors, setPErrors] = useState<Record<string, string>>({});
  const [pDeleteTarget, setPDeleteTarget] = useState<TaskPriority | null>(null);
  const [pSaving, setPSaving] = useState(false);
  const [pDeleting, setPDeleting] = useState(false);

  /* Label state */
  const [lModalOpen, setLModalOpen] = useState(false);
  const [lEditingId, setLEditingId] = useState<string | null>(null);
  const [lForm, setLForm] = useState<LabelForm>(emptyLabelForm());
  const [lErrors, setLErrors] = useState<Record<string, string>>({});
  const [lDeleteTarget, setLDeleteTarget] = useState<TaskLabel | null>(null);
  const [lSaving, setLSaving] = useState(false);
  const [lDeleting, setLDeleting] = useState(false);

  const sortedP = [...priorities].sort((a, b) => a.sort_order - b.sort_order);

  /* ── Priority handlers ──────────────────────────────────────────── */
  function openCreateP() { setPEditingId(null); setPForm(emptyPriorityForm()); setPErrors({}); setPModalOpen(true); }
  function openEditP(item: TaskPriority) {
    setPEditingId(item.id);
    setPForm({ name: item.name, color: item.color, order: item.level });
    setPErrors({});
    setPModalOpen(true);
  }
  async function handleSubmitP() {
    if (!pForm.name.trim()) { setPErrors({ name: "Campo obbligatorio" }); return; }
    setPSaving(true);
    if (pEditingId) {
      const { error } = await updateP(pEditingId, { name: pForm.name, color: pForm.color, level: pForm.order });
      if (error) { toast.error(error); } else { toast.success("Priorita aggiornata"); }
    } else {
      const { error } = await createP({
        name: pForm.name, color: pForm.color, icon: "Circle",
        level: pForm.order, is_default: false, sort_order: priorities.length + 1,
      });
      if (error) { toast.error(error); } else { toast.success("Priorita creata"); }
    }
    setPSaving(false);
    setPModalOpen(false);
  }
  async function handleDeleteP() {
    if (!pDeleteTarget) return;
    setPDeleting(true);
    const { error } = await removeP(pDeleteTarget.id);
    if (error) { toast.error(error); } else { toast.success("Priorita eliminata"); }
    setPDeleting(false);
    setPDeleteTarget(null);
  }

  /* ── Label handlers ─────────────────────────────────────────────── */
  function openCreateL() { setLEditingId(null); setLForm(emptyLabelForm()); setLErrors({}); setLModalOpen(true); }
  function openEditL(item: TaskLabel) {
    setLEditingId(item.id);
    setLForm({ name: item.name, color: item.color });
    setLErrors({});
    setLModalOpen(true);
  }
  async function handleSubmitL() {
    if (!lForm.name.trim()) { setLErrors({ name: "Campo obbligatorio" }); return; }
    setLSaving(true);
    if (lEditingId) {
      const { error } = await updateL(lEditingId, { name: lForm.name, color: lForm.color });
      if (error) { toast.error(error); } else { toast.success("Label aggiornata"); }
    } else {
      const { error } = await createL({ name: lForm.name, color: lForm.color, description: null });
      if (error) { toast.error(error); } else { toast.success("Label creata"); }
    }
    setLSaving(false);
    setLModalOpen(false);
  }
  async function handleDeleteL() {
    if (!lDeleteTarget) return;
    setLDeleting(true);
    const { error } = await removeL(lDeleteTarget.id);
    if (error) { toast.error(error); } else { toast.success("Label eliminata"); }
    setLDeleting(false);
    setLDeleteTarget(null);
  }

  const priorityColumns = [
    {
      key: "color",
      label: "Colore",
      width: "60px",
      render: (item: TaskPriority) => (
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: item.color }} />
      ),
    },
    {
      key: "name",
      label: "Nome",
      render: (item: TaskPriority) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "level",
      label: "Ordine",
      width: "80px",
      render: (item: TaskPriority) => (
        <span style={{
          fontSize: 11, fontWeight: 600, color: item.color,
          background: `${item.color}1a`, borderRadius: 4, padding: "2px 8px",
        }}>
          L{item.level}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Tags}
        title="Priorita e Label"
        description="Configura priorita e etichette per le attivita"
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* ── Left: Priorita ─────────────────────────────────────────── */}
        <SettingsCard title="Priorita" description="Livelli di urgenza per le attivita">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn-primary" onClick={openCreateP}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}>
              <Plus style={{ width: 13, height: 13 }} /> Nuova
            </button>
          </div>
          <SettingsTable<TaskPriority>
            columns={priorityColumns}
            data={sortedP}
            onEdit={openEditP}
            onDelete={(item) => setPDeleteTarget(item)}
            emptyMessage="Nessuna priorita."
            emptyIcon={Tags}
            loading={pLoading}
            onAdd={openCreateP}
          />
        </SettingsCard>

        {/* ── Right: Label ───────────────────────────────────────────── */}
        <SettingsCard title="Label" description="Etichette colorate per organizzare i task">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn-primary" onClick={openCreateL}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}>
              <Plus style={{ width: 13, height: 13 }} /> Nuova
            </button>
          </div>
          {labels.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "48px 0", gap: 8,
            }}>
              <Tags style={{ width: 40, height: 40, color: "var(--text-tertiary)", strokeWidth: 1.2 }} />
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-tertiary)" }}>
                Nessuna label.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {labels.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "5px 12px", borderRadius: "var(--radius-md)",
                    background: `${l.color}1a`,
                    border: `1px solid ${l.color}40`,
                    fontSize: 12, fontWeight: 600, color: l.color,
                    cursor: "pointer",
                  }}
                  onClick={() => openEditL(l)}
                >
                  {l.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); setLDeleteTarget(l); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 0, display: "flex", color: l.color, opacity: 0.6,
                    }}
                  >
                    <XIcon style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SettingsCard>
      </div>

      {/* ── Priority Modal ───────────────────────────────────────────── */}
      <SettingsModal
        open={pModalOpen}
        onClose={() => setPModalOpen(false)}
        title={pEditingId ? "Modifica Priorita" : "Nuova Priorita"}
        onSubmit={handleSubmitP}
        isLoading={pSaving}
      >
        <SettingsFormField label="Nome" required error={pErrors.name}>
          <input className="glass-input" value={pForm.name}
            onChange={(e) => { setPForm((f) => ({ ...f, name: e.target.value })); setPErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome priorità" />
        </SettingsFormField>
        <SettingsFormField label="Colore">
          <SettingsColorPicker value={pForm.color} onChange={(color) => setPForm((f) => ({ ...f, color }))} />
        </SettingsFormField>
        <SettingsFormField label="Ordine (livello)">
          <input className="glass-input" type="number" min={0} max={10}
            value={pForm.order}
            onChange={(e) => setPForm((f) => ({ ...f, order: Number(e.target.value) }))} />
        </SettingsFormField>
      </SettingsModal>

      {/* ── Label Modal ──────────────────────────────────────────────── */}
      <SettingsModal
        open={lModalOpen}
        onClose={() => setLModalOpen(false)}
        title={lEditingId ? "Modifica Label" : "Nuova Label"}
        onSubmit={handleSubmitL}
        isLoading={lSaving}
      >
        <SettingsFormField label="Nome" required error={lErrors.name}>
          <input className="glass-input" value={lForm.name}
            onChange={(e) => { setLForm((f) => ({ ...f, name: e.target.value })); setLErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome label" />
        </SettingsFormField>
        <SettingsFormField label="Colore">
          <SettingsColorPicker value={lForm.color} onChange={(color) => setLForm((f) => ({ ...f, color }))} />
        </SettingsFormField>
      </SettingsModal>

      {/* ── Delete confirms ──────────────────────────────────────────── */}
      <SettingsDeleteConfirm
        open={pDeleteTarget !== null}
        onClose={() => setPDeleteTarget(null)}
        onConfirm={handleDeleteP}
        title="Elimina Priorita"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={pDeleteTarget?.name}
        isLoading={pDeleting}
      />
      <SettingsDeleteConfirm
        open={lDeleteTarget !== null}
        onClose={() => setLDeleteTarget(null)}
        onConfirm={handleDeleteL}
        title="Elimina Label"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={lDeleteTarget?.name}
        isLoading={lDeleting}
      />
    </div>
  );
}
