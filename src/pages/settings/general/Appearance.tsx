import { useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useAccent, ACCENT_PRESETS } from "@/lib/accent";
import type { AccentColor } from "@/lib/accent";
import { useNumberFormat } from "@/lib/numberFormat";
import { useAppearanceSettings } from "../../../hooks/settings";
import {
  SettingsPageHeader,
  SettingsCard,
} from "@/components/settings";
import { getStoredLanguage, setLanguage, SUPPORTED_LANGUAGES } from "@/i18n";
import { useState } from "react";

// Map accent preset swatch hex → AccentColor id
const SWATCH_TO_ACCENT = new Map<string, AccentColor>(
  ACCENT_PRESETS.map((p) => [p.swatch.toLowerCase(), p.id])
);
const ACCENT_TO_SWATCH = new Map<AccentColor, string>(
  ACCENT_PRESETS.map((p) => [p.id, p.swatch])
);

export default function Appearance() {
  const { accent, setAccent } = useAccent();
  const { format, setFormat, formatCurrency } = useNumberFormat();
  const [lang, setLang] = useState(getStoredLanguage());
  const { data: dbSettings, upsert } = useAppearanceSettings();

  // On mount: sync accent from DB if available
  useEffect(() => {
    if (!dbSettings?.accent_color) return;
    const accentId = SWATCH_TO_ACCENT.get(dbSettings.accent_color.toLowerCase());
    if (accentId && accentId !== accent) {
      setAccent(accentId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbSettings]);

  async function handleAccentClick(id: AccentColor) {
    setAccent(id);
    const swatch = ACCENT_TO_SWATCH.get(id) ?? id;
    await upsert({ accent_color: swatch });
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Palette}
        title="Aspetto"
        description="Personalizza il tema e i colori della piattaforma"
      />

      {/* ── Card 1: Colore Accento ── */}
      <SettingsCard title="Colore Accento">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = accent === preset.id;
            return (
              <button
                type="button"
                key={preset.id}
                onClick={() => handleAccentClick(preset.id)}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 8,
                  padding: 0, background: "none", border: "none", cursor: "pointer",
                }}
              >
                <div style={{
                  width: "100%", height: 60,
                  borderRadius: "var(--radius-md)",
                  background: `linear-gradient(135deg, ${preset.swatch}, color-mix(in srgb, ${preset.swatch} 70%, black))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                  border: isSelected ? "2px solid var(--text-primary)" : "1px solid var(--glass-border)",
                  boxShadow: isSelected ? `0 0 0 3px var(--glass-bg), 0 0 0 5px ${preset.swatch}` : "none",
                  transition: "all 0.2s ease",
                }}>
                  {isSelected && (
                    <Check size={20} style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} />
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-body)", fontSize: 11,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "var(--text-primary)" : "var(--text-tertiary)",
                  transition: "color 0.15s ease",
                }}>
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Card 2: Formato Numeri ── */}
      <SettingsCard title="Formato Numeri">
        <div className="glass-segment" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="glass-segment-item"
            data-active={format === "eu"}
            onClick={() => setFormat("eu")}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            EU &mdash; 1.000,00 &euro;
          </button>
          <button
            type="button"
            className="glass-segment-item"
            data-active={format === "us"}
            onClick={() => setFormat("us")}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            US &mdash; $1,000.00
          </button>
        </div>

        <div style={{
          background: "var(--glass-bg)",
          border: "0.5px solid var(--glass-border)",
          borderRadius: "var(--radius-md)",
          padding: "16px 20px",
        }}>
          <p style={{
            fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600,
            color: "var(--text-tertiary)", textTransform: "uppercase",
            letterSpacing: "0.08em", margin: "0 0 12px",
          }}>
            Anteprima
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: "Entrate", value: 12500, color: "var(--color-success)" },
              { label: "Uscite",  value: 3480,  color: "var(--color-error)" },
              { label: "Bilancio", value: 9020, color: "var(--text-primary)" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-tertiary)", margin: "0 0 4px" }}>
                  {label}
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 600, color, margin: 0 }}>
                  {formatCurrency(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SettingsCard>

      {/* ── Card 3: Lingua ── */}
      <SettingsCard title="Lingua">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLang(l.code);
                  setLanguage(l.code);
                }}
                style={{
                  padding: "6px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${active ? "var(--accent-primary)" : "var(--glass-border)"}`,
                  background: active ? "var(--accent-primary-soft)" : "var(--glass-bg)",
                  color: active ? "var(--accent-primary)" : "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </SettingsCard>
    </div>
  );
}
