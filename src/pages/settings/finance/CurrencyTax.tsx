import { useState, useEffect } from "react";
import { Coins, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { useCurrencySettings, useTaxRates } from "../../../hooks/settings";
import type { TaxRate } from "../../../types/settings";
import {
  SettingsPageHeader, SettingsCard, SettingsFormField,
  SettingsTable, SettingsModal, SettingsDeleteConfirm,
  SettingsToggle,
} from "@/components/settings";

type MainCurrency = "EUR" | "USD" | "GBP" | "CHF";

const MAIN_CURRENCIES: { value: MainCurrency; label: string }[] = [
  { value: "EUR", label: "EUR - Euro" },
  { value: "USD", label: "USD - Dollaro" },
  { value: "GBP", label: "GBP - Sterlina" },
  { value: "CHF", label: "CHF - Franco Svizzero" },
];

interface TaxFormState {
  name: string;
  rate: number;
  isDefault: boolean;
}

const emptyTaxForm = (): TaxFormState => ({
  name: "", rate: 0, isDefault: false,
});

export default function CurrencyTaxPage() {
  // Currency singleton
  const { data: currencyData, loading: currencyLoading, upsert: upsertCurrency } = useCurrencySettings();

  const [mainCurrency, setMainCurrency] = useState<MainCurrency>("EUR");
  const [savingCurrency, setSavingCurrency] = useState(false);

  // Sync from loaded data
  useEffect(() => {
    if (!currencyData) return;
    setMainCurrency((currencyData.primary_currency as MainCurrency) ?? "EUR");
  }, [currencyData]);

  async function saveCurrencySettings() {
    setSavingCurrency(true);
    const { error } = await upsertCurrency({
      primary_currency: mainCurrency,
    });
    if (error) { toast.error(error); }
    else { toast.success("Impostazioni valuta salvate"); }
    setSavingCurrency(false);
  }

  // Tax rates
  const { data: rates, loading: ratesLoading, create: createTax, update: updateTax, remove: removeTax } = useTaxRates();

  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [taxEditingId, setTaxEditingId] = useState<string | null>(null);
  const [taxForm, setTaxForm] = useState<TaxFormState>(emptyTaxForm());
  const [deleteTarget, setDeleteTarget] = useState<TaxRate | null>(null);
  const [savingTax, setSavingTax] = useState(false);
  const [deletingTax, setDeletingTax] = useState(false);

  function openCreateTax() {
    setTaxEditingId(null);
    setTaxForm(emptyTaxForm());
    setTaxModalOpen(true);
  }

  function openEditTax(r: TaxRate) {
    setTaxEditingId(r.id);
    setTaxForm({
      name: r.name,
      rate: r.rate,
      isDefault: r.is_default,
    });
    setTaxModalOpen(true);
  }

  async function handleTaxSubmit() {
    if (!taxForm.name.trim()) return;
    setSavingTax(true);

    // Clear default on all others if setting this as default
    if (taxForm.isDefault) {
      for (const r of rates) {
        if (r.id !== taxEditingId && r.is_default) {
          await updateTax(r.id, { is_default: false });
        }
      }
    }

    const payload = {
      name: taxForm.name,
      rate: taxForm.rate,
      is_default: taxForm.isDefault,
    };

    if (taxEditingId) {
      const { error } = await updateTax(taxEditingId, payload);
      if (error) { toast.error(error); }
      else { toast.success("Aliquota aggiornata"); }
    } else {
      const { error } = await createTax({
        ...payload,
        applies_to: "both" as const,
        is_active: true,
      });
      if (error) { toast.error(error); }
      else { toast.success("Aliquota creata"); }
    }
    setSavingTax(false);
    setTaxModalOpen(false);
  }

  async function handleDeleteTax() {
    if (!deleteTarget) return;
    setDeletingTax(true);
    const { error } = await removeTax(deleteTarget.id);
    if (error) { toast.error(error); }
    else { toast.success("Aliquota eliminata"); }
    setDeletingTax(false);
    setDeleteTarget(null);
  }

  const taxColumns = [
    {
      key: "name",
      label: "Nome",
      render: (item: TaxRate) => (
        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</span>
      ),
    },
    {
      key: "rate",
      label: "Aliquota %",
      width: "100px",
      render: (item: TaxRate) => (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          {item.rate}%
        </span>
      ),
    },
    {
      key: "is_default",
      label: "Predefinita",
      width: "100px",
      render: (item: TaxRate) =>
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
        icon={Coins}
        title="Valuta e Tasse"
        description="Imposta la valuta base e le aliquote fiscali"
      />

      {/* Card 1: Currency */}
      <SettingsCard title="Valuta">
        <SettingsFormField label="Valuta Base">
          <select
            className="glass-input"
            value={mainCurrency}
            onChange={(e) => setMainCurrency(e.target.value as MainCurrency)}
            style={{ maxWidth: 260 }}
          >
            {MAIN_CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </SettingsFormField>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            onClick={saveCurrencySettings}
            disabled={savingCurrency}
            className="btn-primary"
            style={{
              fontSize: 13, padding: "8px 20px",
              opacity: savingCurrency ? 0.6 : 1,
            }}
          >
            {savingCurrency ? "Salvataggio..." : "Salva impostazioni"}
          </button>
        </div>
      </SettingsCard>

      {/* Card 2: Tax Rates */}
      <SettingsCard
        title="Aliquote Fiscali"
        description="Gestisci le aliquote IVA e altre tasse"
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button
            onClick={openCreateTax}
            className="btn-primary"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, padding: "8px 16px",
            }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Aggiungi Aliquota
          </button>
        </div>

        <SettingsTable<TaxRate>
          columns={taxColumns}
          data={rates}
          onEdit={openEditTax}
          onDelete={(item) => setDeleteTarget(item)}
          emptyMessage="Nessuna aliquota. Aggiungine una."
          emptyIcon={Coins}
        />
      </SettingsCard>

      <SettingsModal
        open={taxModalOpen}
        onClose={() => setTaxModalOpen(false)}
        title={taxEditingId ? "Modifica Aliquota" : "Nuova Aliquota"}
        onSubmit={handleTaxSubmit}
        isLoading={savingTax}
      >
        <SettingsFormField label="Nome" required>
          <input
            className="glass-input"
            value={taxForm.name}
            onChange={(e) => setTaxForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Es. IVA Standard"
          />
        </SettingsFormField>

        <SettingsFormField label="Percentuale">
          <input
            className="glass-input"
            type="number"
            min={0}
            max={100}
            value={taxForm.rate}
            onChange={(e) => setTaxForm((f) => ({ ...f, rate: Number(e.target.value) }))}
          />
        </SettingsFormField>

        <SettingsFormField label="Predefinita">
          <SettingsToggle
            checked={taxForm.isDefault}
            onChange={(v) => setTaxForm((f) => ({ ...f, isDefault: v }))}
            label="Imposta come aliquota predefinita"
          />
        </SettingsFormField>
      </SettingsModal>

      <SettingsDeleteConfirm
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTax}
        title="Elimina Aliquota"
        message="Questa azione è irreversibile. Vuoi eliminare"
        itemName={deleteTarget?.name}
        isLoading={deletingTax}
      />
    </div>
  );
}
