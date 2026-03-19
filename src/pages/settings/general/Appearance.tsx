import { useState, useEffect } from "react";
import { Palette, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAppearanceSettings } from "../../../hooks/settings";

const GOLD = "#C6A961";
const BG_CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#374151";
const TEXT_MUTED = "#6b7280";

const ACCENT_PRESETS = ["#C6A961","#4A9EFF","#4ADE80","#EF4444","#EC4899","#A78BFA","#F59E0B","#14B8A6","#60A5FA","#FB923C","#84CC16","#6B7280"];

type Theme = "dark" | "light" | "auto";
type Density = "compact" | "comfortable" | "spacious";
type SidebarStyle = "icons_only" | "icons_labels" | "full_width";

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      color: TEXT_MUTED, paddingBottom: 10, borderBottom: `0.5px solid ${BORDER}`,
      marginBottom: 16, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

function PillGroup<T extends string>({
  options, value, onChange, labelMap,
}: { options: T[]; value: T; onChange: (v: T) => void; labelMap?: Record<string, string> }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map(opt => (
        <button type="button"
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 14px", borderRadius: 7, border: `0.5px solid ${value === opt ? GOLD + "88" : BORDER}`,
            background: value === opt ? "#fef9ee" : "#f9fafb",
            color: value === opt ? GOLD : TEXT_SECONDARY,
            cursor: "pointer", fontSize: 12, fontWeight: value === opt ? 600 : 400, transition: "all 0.15s",
          }}
        >
          {labelMap?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {ACCENT_PRESETS.map(c => (
          <button type="button"
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: 28, height: 28, borderRadius: "50%", background: c, padding: 0,
              border: value === c ? "2.5px solid white" : "2.5px solid transparent",
              cursor: "pointer", transition: "border-color 0.15s", flexShrink: 0,
              boxShadow: value === c ? `0 0 0 1px ${c}` : "none",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 28, border: "none", background: "transparent", cursor: "pointer", padding: 0 }} />
        <input
          className="glass-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#RRGGBB"
          style={{ width: 100 }}
        />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: TEXT_PRIMARY }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{description}</div>}
      </div>
      <button type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
          background: checked ? GOLD : "#d1d5db", position: "relative",
          transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: "50%", background: "white",
          transition: "left 0.2s", display: "block",
        }} />
      </button>
    </div>
  );
}

function LivePreview({
  theme, accentColor, fontFamily, density, sidebarStyle,
}: {
  theme: Theme; accentColor: string; fontFamily: string; density: Density; sidebarStyle: SidebarStyle;
}) {
  const isDark = theme === "dark" || theme === "auto";
  const bg = isDark ? "#0A0A0B" : "#F8F8F8";
  const sbBg = isDark ? "#111113" : "#EBEBED";
  const cardBg = "#f3f4f6";
  const textMain = "#111827";
  const textSub = "#6b7280";
  const borderColor = "#e5e7eb";
  const navItems = ["Dashboard", "Finance", "Progetti"];
  const activeItem = "Dashboard";
  const sidebarW = sidebarStyle === "icons_only" ? 40 : 80;
  const itemPad = density === "compact" ? "3px 6px" : density === "spacious" ? "7px 6px" : "5px 6px";

  return (
    <div style={{
      width: "100%", height: 200, borderRadius: 10,
      border: `0.5px solid #e5e7eb`,
      background: bg, display: "flex", overflow: "hidden",
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarW, background: sbBg, borderRight: `0.5px solid ${borderColor}`,
        padding: 6, display: "flex", flexDirection: "column", gap: 3, flexShrink: 0,
        transition: "width 0.2s",
      }}>
        <div style={{
          fontSize: 7, fontWeight: 700, color: accentColor, marginBottom: 6,
          padding: "2px 4px", fontFamily,
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          {sidebarStyle === "icons_only" ? "IC" : "ICONOFF"}
        </div>
        {navItems.map(item => {
          const isActive = item === activeItem;
          return (
            <div key={item} style={{
              padding: itemPad, borderRadius: 5, fontSize: 8, fontWeight: isActive ? 600 : 400,
              color: isActive ? accentColor : textSub,
              background: isActive ? `${accentColor}20` : "transparent",
              borderLeft: `2px solid ${isActive ? accentColor : "transparent"}`,
              whiteSpace: "nowrap", overflow: "hidden",
              transition: "all 0.15s",
            }}>
              {sidebarStyle === "icons_only" ? item[0] : item}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: textMain,
          fontFamily, letterSpacing: "0.02em",
        }}>
          Dashboard
        </div>
        <div style={{
          background: cardBg, border: `0.5px solid ${borderColor}`,
          borderRadius: 7, padding: "8px 10px", flex: 1,
        }}>
          <div style={{ fontSize: 7, color: textSub, marginBottom: 6 }}>Panoramica</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                flex: 1, height: 28, borderRadius: 5,
                background: i === 1 ? `${accentColor}22` : "#f3f4f6",
                border: `0.5px solid ${i === 1 ? accentColor + "40" : borderColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 7, color: i === 1 ? accentColor : textSub }}>
                  {i === 1 ? "●" : "○"} KPI {i}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 8, padding: "5px 8px", borderRadius: 5,
            background: accentColor, display: "inline-flex", alignItems: "center",
          }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: "#000" }}>Azione primaria</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Appearance() {
  const { data, loading, upsert } = useAppearanceSettings();

  const [theme, setTheme] = useState<Theme>("dark");
  const [accentColor, setAccentColor] = useState("#C6A961");
  const [fontFamily, setFontFamily] = useState("Cormorant Garamond");
  const [density, setDensity] = useState<Density>("comfortable");
  const [sidebarStyle, setSidebarStyle] = useState<SidebarStyle>("icons_labels");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setTheme(data.theme ?? "dark");
      setAccentColor(data.accent_color ?? "#C6A961");
      setFontFamily(data.font_family ?? "Cormorant Garamond");
      setDensity(data.sidebar_density ?? "comfortable");
      setSidebarStyle(data.sidebar_style ?? "icons_labels");
    }
  }, [data]);

  async function handleSave() {
    setSaving(true);
    const { error } = await upsert({
      theme,
      accent_color: accentColor,
      font_family: fontFamily,
      sidebar_density: density,
      sidebar_style: sidebarStyle,
    });
    setSaving(false);
    if (error) { toast({ title: "Errore", description: error, variant: "destructive" }); return; }
    toast({ title: "Aspetto salvato", description: "Le impostazioni visive sono state aggiornate." });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
        <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>
          Aspetto &amp; Tema
        </h2>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, margin: "4px 0 0" }}>
          Personalizza il look and feel del portale
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
        {/* Settings column */}
        <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "24px 28px" }}>

          <SectionTitle>Tema</SectionTitle>
          <div style={{ marginBottom: 22 }}>
            <PillGroup
              options={["dark", "light", "auto"] as Theme[]}
              value={theme}
              onChange={setTheme}
              labelMap={{ dark: "Dark", light: "Light", auto: "Auto" }}
            />
          </div>

          <SectionTitle>Colore Accent</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 22 }}>
            <div style={labelStyle}>
              <span style={labelText}>Accent Primario</span>
              <ColorPicker value={accentColor} onChange={setAccentColor} />
            </div>
          </div>

          <SectionTitle>Tipografia</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
            <label style={labelStyle}>
              <span style={labelText}>Font</span>
              <select className="glass-input" value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                <option value="Cormorant Garamond">Cormorant Garamond</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Inter">Inter</option>
                <option value="Georgia">Georgia</option>
              </select>
            </label>
          </div>

          <SectionTitle>Layout &amp; Comportamento</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 22 }}>
            <div style={labelStyle}>
              <span style={labelText}>Densità Interfaccia</span>
              <PillGroup
                options={["compact", "comfortable", "spacious"] as Density[]}
                value={density}
                onChange={setDensity}
                labelMap={{ compact: "Compatta", comfortable: "Standard", spacious: "Ampia" }}
              />
            </div>
            <div style={labelStyle}>
              <span style={labelText}>Stile Sidebar</span>
              <PillGroup
                options={["icons_only", "icons_labels", "full_width"] as SidebarStyle[]}
                value={sidebarStyle}
                onChange={setSidebarStyle}
                labelMap={{ icons_only: "Solo icone", icons_labels: "Icone + etichette", full_width: "Espansa" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="glass-btn-primary" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Palette size={14} />}
              Salva Modifiche
            </button>
          </div>
        </div>

        {/* Preview column */}
        <div style={{ width: 280, position: "sticky", top: 0 }}>
          <div style={{ background: BG_CARD, border: `0.5px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Anteprima
            </div>
            <LivePreview
              theme={theme}
              accentColor={accentColor}
              fontFamily={fontFamily}
              density={density}
              sidebarStyle={sidebarStyle}
            />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: accentColor }} />
                <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>Accent</span>
                <span style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: "auto" }}>{accentColor}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>Tema</span>
                <span style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: "auto" }}>{theme}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: TEXT_SECONDARY }}>Font</span>
                <span style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: "auto", textAlign: "right", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fontFamily}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
