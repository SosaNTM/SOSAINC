import { useState } from "react";
import {
  CreditCard, Building2, Wallet, Coins, Banknote, MoreHorizontal, Plus, Star,
} from "lucide-react";
import { toast } from "sonner";
import { usePaymentMethods } from "../../../hooks/settings";
import type { PaymentMethod } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsToggle,
} from "@/components/settings";

type PaymentType = "card" | "bank" | "cash" | "crypto" | "digital" | "other";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  card:    { label: "Carta",     icon: CreditCard },
  bank:    { label: "Bonifico",  icon: Building2 },
  cash:    { label: "Contanti",  icon: Banknote },
  crypto:  { label: "Crypto",    icon: Coins },
  digital: { label: "PayPal",    icon: Wallet },
  other:   { label: "Altro",     icon: MoreHorizontal },
};

interface FormState {
  name: string;
  type: PaymentType;
  isDefault: boolean;
}

const emptyForm = (): FormState => ({
  name: "", type: "card", isDefault: false,
});

export default function PaymentMethodsPage() {
  const { data: methods, loading, create, update, remove } = usePaymentMethods();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(m: PaymentMethod) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      type: m.type as PaymentType,
      isDefault: m.is_default,
    });
    setErrors({});
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Campo obbligatorio";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);

    // Clear default on all others if setting this as default
    if (form.isDefault) {
      for (const m of methods) {
        if (m.id !== editingId && m.is_default) {
          await update(m.id, { is_default: false });
        }
      }
    }

    const payload = {
      name: form.name,
      type: form.type as PaymentMethod["type"],
      is_default: form.isDefault,
    };

    if (editingId) {
      const { error } = await update(editingId, payload);
      if (error) { toast.error(error); }
      else { toast.success("Metodo aggiornato"); }
    } else {
      const { error } = await create({
        ...payload,
        last_four: null,
        is_active: true,
        last_used_at: null,
        sort_order: methods.length,
      });
      if (error) { toast.error(error); }
      else { toast.success("Metodo aggiunto"); }
    }
    setSaving(false);
    setModalOpen(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await remove(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Metodo eliminato"); }
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "icon",
      label: "Icona",
      width: "60px",
      render: (item: PaymentMethod) => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other;
        const Icon = cfg.icon;
        return (
          <div style={{
            width: 32, height: 32, borderRadius: "var(--radius-md)",
            background: "var(--accent-primary-soft)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 16, height: 16, color: "var(--accent-primary)" }} />
          </div>
        );
      },
    },
    {
      key: "name",
      label: "Nome",
      render: (item: PaymentMethod) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      width: "120px",
      render: (item: PaymentMethod) => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other;
        return (
          <span style={{
            fontSize: 12, padding: "3px 10px", borderRadius: 9999,
            background: "var(--bg-card-inner)",
            color: "var(--text-secondary)", fontWeight: 500,
          }}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: "is_default",
      label: "Predefinito",
      width: "100px",
      render: (item: PaymentMethod) =>
        item.is_default ? (
          <span style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 9999,
            background: "var(--accent-primary-soft)",
            color: "var(--accent-primary)", fontWeight: 600,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Star style={{ width: 10, height: 10 }} /> Default
          </span>
        ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={CreditCard}
        title="Metodi di Pagamento"
        description="Configura i metodi per le transazioni"
        action={{ label: "Aggiungi Metodo", icon: Plus, onClick: openCreate }}
      />

      <SettingsCard>
        <SettingsTable<PaymentMethod>
          columns={columns}
          data={methods}
          onEdit={openEdit}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessun metodo di pagamento. Aggiungine uno."
          emptyIcon={CreditCard}
          loading={loading}
          onAdd={openCreate}
        />
      </SettingsCard>

      <SettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Modifica Metodo" : "Nuovo Metodo di Pagamento"}
        onSubmit={handleSubmit}
        isLoading={saving}
      >
        <SettingsFormField label="Nome" required error={errors.name}>
          <input
            className="glass-input"
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((e2) => ({ ...e2, name: "" })); }}
            placeholder="Es. Visa Business"
          />
        </SettingsFormField>

        <SettingsFormField label="Tipo">
          <select
            className="glass-input"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as PaymentType }))}
          >
            <option value="card">Carta</option>
            <option value="bank">Bonifico</option>
            <option value="cash">Contanti</option>
            <option value="crypto">Crypto</option>
            <option value="digital">PayPal</option>
            <option value="other">Altro</option>
          </select>
        </SettingsFormField>

        <SettingsFormField label="Predefinito">
          <SettingsToggle
            checked={form.isDefault}
            onChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
            label="Imposta come metodo predefinito"
          />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Elimina Metodo"
        message="Questa azione è irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deleting}
      />
    </div>
  );
}
