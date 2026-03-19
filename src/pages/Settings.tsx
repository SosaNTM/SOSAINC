import { useState } from "react";
import {
  Building2,
  Receipt,
  Palette,
  Layers,
  Save,
  Trash2,
  Plus,
  Users,
  UserPlus,
  Package,
  Monitor,
  Server,
  Megaphone,
  Briefcase,
  Landmark,
  Shield,
  MoreHorizontal,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import {
  TAX_RATE,
  directCostCategories,
  indirectCostCategories,
  type CostCategory,
} from "@/lib/financialCalculations";
import { useTheme } from "@/lib/theme";
import { useAccent, ACCENT_PRESETS } from "@/lib/accent";
import { useNumberFormat } from "@/lib/numberFormat";
import { usePeriod } from "@/lib/periodContext";
import { toast } from "@/hooks/use-toast";

const iconOptions = [
  { name: "Users", Icon: Users },
  { name: "UserPlus", Icon: UserPlus },
  { name: "Package", Icon: Package },
  { name: "Monitor", Icon: Monitor },
  { name: "Server", Icon: Server },
  { name: "Building2", Icon: Building2 },
  { name: "Megaphone", Icon: Megaphone },
  { name: "Briefcase", Icon: Briefcase },
  { name: "Landmark", Icon: Landmark },
  { name: "Shield", Icon: Shield },
  { name: "MoreHorizontal", Icon: MoreHorizontal },
];

const iconMap: Record<string, React.FC<any>> = {
  Users, UserPlus, Package, Monitor, Server,
  Building2, Megaphone, Briefcase, Landmark, Shield, MoreHorizontal,
};

const inputStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 13,
  color: "#111827",
  outline: "none",
  height: 36,
  width: "100%",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none" as any,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#6b7280",
  marginBottom: 4,
  display: "block",
  letterSpacing: "0.2px",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: "18px 22px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e7eb",
};

const LabeledInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <input {...props} style={inputStyle} />
  </div>
);

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const { format, setFormat } = useNumberFormat();
  const { period, setPeriod } = usePeriod();

  const [company, setCompany] = useState({ name: "ICONOFF", vat: "", address: "", email: "", phone: "" });
  const [currency, setCurrency] = useState("EUR");
  const [fiscalStart, setFiscalStart] = useState("January");

  const [corpTax, setCorpTax] = useState(Math.round(TAX_RATE * 100));
  const [vatRate, setVatRate] = useState(22);
  const [autoVat, setAutoVat] = useState(true);

  const [cats, setCats] = useState<CostCategory[]>([...directCostCategories, ...indirectCostCategories]);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat, setNewCat] = useState({ label: "", icon: "Package", type: "direct" as "direct" | "indirect" });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Impostazioni salvate", description: "Le modifiche sono state applicate con successo." });
  };

  const handleSavePreferences = () => {
    toast({ title: "Preferenze salvate ✓", description: "Le impostazioni di visualizzazione sono state aggiornate." });
  };

  const directList = cats.filter((c) => c.type === "direct");
  const indirectList = cats.filter((c) => c.type === "indirect");

  const addCategory = () => {
    if (!newCat.label) return;
    const id = newCat.label.toLowerCase().replace(/\s+/g, "-");
    setCats((p) => [...p, { id, label: newCat.label, icon: newCat.icon, type: newCat.type }]);
    setNewCat({ label: "", icon: "Package", type: "direct" });
    setShowAddCat(false);
  };

  const removeCategory = (id: string) => {
    setCats((p) => p.filter((c) => c.id !== id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900, padding: "20px 24px" }}>

      {/* SECTION 1 — Company Profile + Tax Settings */}
      <div style={{ ...cardStyle, animation: "fadeInUp 0.4s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Building2 size={16} color="#6b7280" />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Company Profile</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 12 }}>
          <LabeledInput label="Company Name" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
          <LabeledInput label="VAT Number" value={company.vat} onChange={(e) => setCompany({ ...company, vat: e.target.value })} placeholder="e.g. IT12345678901" />
          <div style={{ gridColumn: "1 / -1" }}>
            <LabeledInput label="Address" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} placeholder="Street, City, Country" />
          </div>
          <LabeledInput label="Email" type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} placeholder="finance@iconoff.com" />
          <LabeledInput label="Phone" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} placeholder="+39 02 1234567" />
          <div>
            <label style={labelStyle}>Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={selectStyle}>
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fiscal Year Start</label>
            <select value={fiscalStart} onChange={(e) => setFiscalStart(e.target.value)} style={selectStyle}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tax Settings subsection */}
        <div style={{ ...dividerStyle, paddingTop: 16, marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Receipt size={16} color="#6b7280" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Tax Settings</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Corporate Tax Rate</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  value={corpTax}
                  onChange={(e) => setCorpTax(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 80, textAlign: "right" }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#6b7280" }}>%</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>VAT Rate</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 80, textAlign: "right" }}
                />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#6b7280" }}>%</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", ...dividerStyle }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Apply VAT to invoices automatically</span>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, margin: "2px 0 0" }}>
                Tax rate changes will recalculate all Net Profit values.
              </p>
            </div>
            <button type="button"
              onClick={() => setAutoVat(!autoVat)}
              style={{
                position: "relative",
                flexShrink: 0,
                width: 40,
                height: 22,
                borderRadius: 11,
                background: autoVat ? "var(--accent-color, #3b82f6)" : "#d1d5db",
                border: "none",
                cursor: "pointer",
                transition: "background 0.3s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  width: 16,
                  height: 16,
                  top: 3,
                  left: autoVat ? 21 : 3,
                  borderRadius: "50%",
                  background: "#ffffff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 0.3s ease",
                }}
              />
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12, ...dividerStyle }}>
          <button type="button" onClick={handleSave}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 16px", borderRadius: 8, height: 34,
              background: "var(--accent-color, #3b82f6)", color: "#fff",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Save size={14} />
            {saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* SECTION 2 — Cost Categories */}
      <div style={{ ...cardStyle, animation: "fadeInUp 0.4s 0.1s both" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={16} color="#6b7280" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Cost Categories</h3>
          </div>
          <button type="button" onClick={() => setShowAddCat(!showAddCat)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "4px 10px", borderRadius: 7,
              background: "#f3f4f6", border: "1px solid #e5e7eb",
              fontSize: 11, fontWeight: 600, color: "#374151", cursor: "pointer",
            }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {showAddCat && (
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8,
            marginBottom: 12, padding: "12px 14px",
            background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10,
          }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={labelStyle}>Name</label>
              <input
                value={newCat.label}
                onChange={(e) => setNewCat({ ...newCat, label: e.target.value })}
                placeholder="Category name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Icon</label>
              <select value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })} style={{ ...selectStyle, width: "auto", height: 32 }}>
                {iconOptions.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={newCat.type} onChange={(e) => setNewCat({ ...newCat, type: e.target.value as "direct" | "indirect" })} style={{ ...selectStyle, width: "auto", height: 32 }}>
                <option value="direct">Direct (COGS)</option>
                <option value="indirect">Indirect (OPEX)</option>
              </select>
            </div>
            <button type="button" onClick={addCategory}
              style={{
                padding: "6px 12px", borderRadius: 8, height: 32,
                background: "var(--accent-color, #3b82f6)", color: "#fff",
                border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >Add</button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Direct */}
          <div>
            <div style={{ borderLeft: "3px solid hsl(160 68% 43%)", paddingLeft: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(160 68% 43%)", letterSpacing: "0.4px" }}>DIRECT COSTS (COGS)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {directList.map((cat) => {
                const Icon = iconMap[cat.icon];
                return (
                  <div key={cat.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px", borderRadius: 8, background: "#f3f4f6",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: "hsl(160 68% 43% / 0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {Icon && <Icon size={12} color="hsl(160 68% 43%)" />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{cat.label}</span>
                    </div>
                    <button type="button" onClick={() => removeCategory(cat.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indirect */}
          <div>
            <div style={{ borderLeft: "3px solid hsl(38 92% 55%)", paddingLeft: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "hsl(38 92% 55%)", letterSpacing: "0.4px" }}>INDIRECT COSTS (OPEX)</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {indirectList.map((cat) => {
                const Icon = iconMap[cat.icon];
                return (
                  <div key={cat.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px", borderRadius: 8, background: "#f3f4f6",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: "hsl(38 92% 55% / 0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {Icon && <Icon size={12} color="hsl(38 92% 55%)" />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{cat.label}</span>
                    </div>
                    <button type="button" onClick={() => removeCategory(cat.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Display Preferences */}
      <div style={{ ...cardStyle, animation: "fadeInUp 0.4s 0.15s both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Palette size={16} color="#6b7280" />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Display Preferences</h3>
        </div>

        {/* Theme */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Theme</span>
          <div style={{
            display: "inline-flex", borderRadius: 10, padding: 3, gap: 2,
            background: "#f3f4f6", border: "1px solid #e5e7eb",
          }}>
            {(["dark", "light"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTheme(t)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: theme === t ? "#ffffff" : "transparent",
                  color: theme === t ? "#111827" : "#9ca3af",
                  border: theme === t ? "1px solid #e5e7eb" : "1px solid transparent",
                  cursor: "pointer", boxShadow: theme === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {t === "dark" ? <Moon size={12} /> : <Sun size={12} />}
                {t === "dark" ? "Dark" : "Light"}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Theme Color</span>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, margin: "3px 0 0" }}>Choose a color personality for the entire app</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, maxWidth: 300 }}>
            {ACCENT_PRESETS.map((preset) => (
              <button type="button"
                key={preset.id}
                title={preset.label}
                onClick={() => setAccent(preset.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "8px 6px", borderRadius: 10,
                  background: accent === preset.id ? "#eff6ff" : "#f9fafb",
                  border: accent === preset.id ? "1.5px solid var(--accent-color, #3b82f6)" : "1.5px solid #e5e7eb",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <div style={{
                  position: "relative", width: 28, height: 28, borderRadius: "50%",
                  background: preset.swatch, flexShrink: 0,
                }}>
                  {accent === preset.id && (
                    <span style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 13, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}>✓</span>
                  )}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: accent === preset.id ? "var(--accent-color, #3b82f6)" : "#9ca3af",
                }}>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Number Format */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Number Format</span>
          <div style={{
            display: "inline-flex", borderRadius: 10, padding: 3, gap: 2,
            background: "#f3f4f6", border: "1px solid #e5e7eb",
          }}>
            {(["eu", "us"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFormat(f)}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: format === f ? "#ffffff" : "transparent",
                  color: format === f ? "#111827" : "#9ca3af",
                  border: format === f ? "1px solid #e5e7eb" : "1px solid transparent",
                  cursor: "pointer", boxShadow: format === f ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {f === "eu" ? "1.000,00" : "1,000.00"}
              </button>
            ))}
          </div>
        </div>

        {/* Default Period */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Default Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value as any)} style={{ ...selectStyle, width: "auto", height: 32, fontSize: 12 }}>
            <option value="last-7-days">Last 7 Days</option>
            <option value="last-month">Last Month</option>
            <option value="this-year">This Year</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          <button type="button" onClick={handleSavePreferences}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 16px", borderRadius: 8, height: 34,
              background: "var(--accent-color, #3b82f6)", color: "#fff",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            <Check size={14} />
            Save Preferences
          </button>
        </div>
      </div>

    </div>
  );
};

export default Settings;
