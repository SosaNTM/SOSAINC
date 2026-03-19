import { useState, useMemo, useEffect } from "react";
import { Plus, Minus, XIcon } from "lucide-react";
import { fmtEur } from "@/lib/financialCalculations";
import {
  addInvoice,
  nextInvoiceNumber,
  computeInvoiceTotals,
  getUniqueClients,
  type LineItem,
} from "@/lib/invoiceStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const emptyLine = (): LineItem => ({ description: "", quantity: 1, unitPrice: 0 });

const paymentTerms = [
  { label: "30 giorni", days: 30 },
  { label: "60 giorni", days: 60 },
  { label: "90 giorni", days: 90 },
  { label: "Personalizzato", days: 0 },
];

export function CreateInvoiceModal({ open, onClose }: Props) {
  const [client, setClient] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [taxRate, setTaxRate] = useState(22);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(30);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const existingClients = getUniqueClients();
  const filteredClients = existingClients.filter((c) =>
    c.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const { subtotal, tax, total } = computeInvoiceTotals(items, taxRate);

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  };

  const setTermsAndDue = (days: number) => {
    setTerms(days);
    if (days > 0 && date) {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      setDueDate(d.toISOString().slice(0, 10));
    }
  };

  const selectClient = (c: string) => {
    setClient(c);
    setClientSearch(c);
    setShowClientDropdown(false);
    setShowNewClient(false);
  };

  const submit = (status: "draft" | "pending") => {
    if (!client || items.every((i) => !i.description)) return;
    addInvoice({
      number: nextInvoiceNumber(),
      client,
      date,
      dueDate: dueDate || date,
      items: items.filter((i) => i.description),
      taxRate,
      notes,
      status,
    });
    setClient("");
    setClientSearch("");
    setDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setItems([emptyLine()]);
    setTaxRate(22);
    setNotes("");
    onClose();
  };

  const pillStyle = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600 as const,
    color: active ? "hsl(160 68% 43%)" : "hsl(var(--muted-foreground))",
    background: active ? "hsl(160 68% 43% / 0.1)" : "rgba(255,255,255,0.04)",
    border: active ? "1px solid hsl(160 68% 43% / 0.2)" : "1px solid rgba(255,255,255,0.08)",
    cursor: "pointer" as const,
    transition: "all 0.3s ease",
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(20px)" }}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl glass-card max-h-[90vh] overflow-y-auto"
        style={{ animation: "fadeInUp 0.3s ease-out", padding: 32, borderRadius: 24 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.95)", width: "100%", textAlign: "center" }}>Nuova Fattura</h2>
          <button type="button" onClick={onClose} className="absolute top-5 right-5" style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", fontSize: 14 }}>✕</button>
        </div>

        {/* Client selector */}
        <div className="mb-4 relative">
          <label className="text-xs text-muted-foreground font-semibold mb-1.5 block">Cliente</label>
          {showNewClient ? (
            <div className="flex gap-2">
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nome nuovo cliente"
                className="glass-input flex-1 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                autoFocus
              />
              <button type="button" onClick={() => { setShowNewClient(false); setClient(""); setClientSearch(""); }} className="glass-btn px-3 py-2 text-xs text-muted-foreground">Annulla</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Cerca cliente..."
                className="glass-input w-full px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {showClientDropdown && (
                <div
                  className="absolute top-full left-0 right-0 z-50 mt-1"
                  style={{ background: "rgba(30,30,35,0.95)", borderRadius: 14, border: "0.5px solid rgba(255,255,255,0.15)", padding: 4, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", backdropFilter: "blur(20px)", maxHeight: 200, overflowY: "auto" }}
                >
                  {filteredClients.map((c) => (
                    <button type="button"
                      key={c}
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-3 py-2 text-sm transition-colors duration-200"
                      style={{ borderRadius: 8, color: "rgba(255,255,255,0.7)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {c}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => { setShowNewClient(true); setShowClientDropdown(false); setClient(""); }}
                    className="w-full text-left px-3 py-2 text-sm transition-colors duration-200 flex items-center gap-1.5"
                    style={{ borderRadius: 8, color: "hsl(160 68% 43%)", borderTop: "0.5px solid rgba(255,255,255,0.06)", marginTop: 2 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(52,211,153,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Nuovo cliente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dates + Payment Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground font-semibold mb-1.5 block">Data Emissione</label>
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); if (terms > 0) setTermsAndDue(terms); }} className="glass-input w-full px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold mb-1.5 block">Termini di Pagamento</label>
            <div className="flex flex-wrap gap-1.5">
              {paymentTerms.map((t) => (
                <button type="button" key={t.days} style={pillStyle(terms === t.days)} onClick={() => setTermsAndDue(t.days)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold mb-1.5 block">Scadenza</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="glass-input w-full px-3 py-2.5 text-sm text-foreground outline-none" />
          </div>
        </div>

        {/* Line items */}
        <label className="text-xs text-muted-foreground font-semibold mb-2 block">Voci Fattura</label>
        <div className="space-y-2 mb-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_60px_100px_90px_32px] gap-2 items-center">
              <input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Descrizione" className="glass-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none" />
              <input type="number" value={it.quantity || ""} onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} placeholder="Qtà" className="glass-input px-2 py-2 text-xs text-foreground text-center outline-none" />
              <input type="number" value={it.unitPrice || ""} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} placeholder="€ Unit." className="glass-input px-2 py-2 text-xs text-foreground text-right outline-none" />
              <span className="text-xs font-bold text-foreground text-right">{fmtEur(it.quantity * it.unitPrice)}</span>
              {items.length > 1 && (
                <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="glass-btn p-1.5 text-muted-foreground hover:text-destructive">
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setItems((p) => [...p, emptyLine()])}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 mb-5 transition-all"
          style={{ borderRadius: 12, border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <Plus className="h-3.5 w-3.5" /> Aggiungi riga
        </button>

        {/* Totals */}
        <div className="space-y-2 mb-5" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 16 }}>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-semibold">Subtotale</span>
            <span className="text-foreground font-bold">{fmtEur(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-2">
              IVA
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} className="glass-input w-14 px-2 py-1 text-xs text-foreground text-center outline-none" />
              %
            </span>
            <span className="text-foreground font-bold">{fmtEur(tax)}</span>
          </div>
          <div className="flex justify-between" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 10 }}>
            <span className="text-sm font-extrabold text-foreground">Totale Fattura</span>
            <span className="text-lg font-extrabold" style={{ color: "hsl(160 68% 43%)" }}>{fmtEur(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="text-xs text-muted-foreground font-semibold mb-1.5 block">Note</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note aggiuntive..." rows={2} className="glass-input w-full px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => submit("draft")} className="glass-btn flex-1 py-3 text-sm font-semibold text-muted-foreground">Salva come Bozza</button>
          <button type="button" onClick={() => submit("pending")} className="glass-btn-primary flex-1 py-3 text-sm font-semibold">Crea Fattura</button>
        </div>
      </div>
    </>
  );
}
