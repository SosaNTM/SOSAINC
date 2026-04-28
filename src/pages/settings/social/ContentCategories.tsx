import { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { toast } from "sonner";
import { useContentCategories } from "../../../hooks/settings";
import type { ContentCategory } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsColorPicker,
} from "@/components/settings";

interface FormState {
  name: string;
  color: string;
  defaultHashtags: string;
}

const emptyForm = (): FormState => ({
  name: "", color: "#6366f1", defaultHashtags: "",
});

export default function ContentCategoriesPage() {
  const { data: categories, loading, create, update, remove } = useContentCategories();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<ContentCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(cat: ContentCategory) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      color: cat.color,
      defaultHashtags: cat.description ?? "",
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await update(editingId, {
        name: form.name,
        color: form.color,
        description: form.defaultHashtags || null,
      });
      if (error) { toast.error(error); }
      else { toast.success("Categoria aggiornata"); }
    } else {
      const { error } = await create({
        name: form.name,
        color: form.color,
        platforms: [],
        frequency: null,
        description: form.defaultHashtags || null,
        is_active: true,
        sort_order: categories.length + 1,
      });
      if (error) { toast.error(error); }
      else { toast.success("Categoria creata"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Categoria eliminata"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "color",
      label: "Colore",
      width: "60px",
      render: (item: ContentCategory) => (
        <div style={{
          width: 12, height: 12, borderRadius: "50%",
          background: item.color,
        }} />
      ),
    },
    {
      key: "name",
      label: "Nome",
      render: (item: ContentCategory) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "description",
      label: "Hashtag Predefiniti",
      render: (item: ContentCategory) => (
        <span style={{
          fontSize: 11, color: "var(--text-tertiary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          display: "block", maxWidth: 260,
        }}>
          {item.description ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Layers}
        title="Categorie Contenuti"
        description="Organizza i tuoi contenuti social"
        action={{ label: "Aggiungi Categoria", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<ContentCategory>
          columns={columns}
          data={sorted}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuna categoria. Creane una nuova."
          emptyIcon={Layers}
          loading={loading}
          onAdd={openCreate}
        />
      </SettingsCard>

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Categoria" : "Nuova Categoria"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input className="glass-input" value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Nome categoria" />
        </SettingsFormField>

        <SettingsFormField label="Colore">
          <SettingsColorPicker
            value={form.color}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Hashtag predefiniti" description="Separati da virgola o su righe diverse">
          <textarea className="glass-input" value={form.defaultHashtags}
            onChange={(e) => setForm((f) => ({ ...f, defaultHashtags: e.target.value }))}
            placeholder="#brand, #contenuto, #social"
            rows={3} style={{ resize: "vertical" }} />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Categoria"
        message="Questa azione e irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
