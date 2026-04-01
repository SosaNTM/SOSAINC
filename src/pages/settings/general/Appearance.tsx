import { useState } from "react";
import { Palette, Check } from "lucide-react";
import { useAccent, ACCENT_PRESETS } from "@/lib/accent";
import { useNumberFormat } from "@/lib/numberFormat";
import {
  SettingsPageHeader,
  SettingsCard,
} from "@/components/settings";
import { getStoredLanguage, setLanguage, SUPPORTED_LANGUAGES } from "@/i18n";

export default function Appearance() {
  const { accent, setAccent } = useAccent();
  const { format, setFormat, formatCurrency } = useNumberFormat();
  const [lang, setLang] = useState(getStoredLanguage());

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Palette}
        title="Aspetto"
        description="Personalizza il tema e i colori della piattaforma"
      />

      {/* ── Card 1: Colore Accento ── */}
      <SettingsCard title="Colore Accento">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
          }}
        >
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = accent === preset.id;
            return (
              <button
                type="button"
                key={preset.id}
                onClick={() => setAccent(preset.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: 0,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 60,
                    borderRadius: "var(--radius-md)",
                    background: `linear-gradient(135deg, ${preset.swatch}, color-mix(in srgb, ${preset.swatch} 70%, black))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    border: isSelected
                      ? "2px solid var(--text-primary)"
                      : "1px solid var(--glass-border)",
                    boxShadow: isSelected
                      ? `0 0 0 3px var(--glass-bg), 0 0 0 5px ${preset.swatch}`
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isSelected && (
                    <Check
                      size={20}
                      style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                    />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 11,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected
                      ? "var(--text-primary)"
                      : "var(--text-tertiary)",
                    transition: "color 0.15s ease",
                  }}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      {/* ── Card 3: Formato Numeri ── */}
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

        {/* Live preview */}
        <div
          style={{
            background: "var(--glass-bg)",
            border: "0.5px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 12px",
            }}
          >
            Anteprima
          </p>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  margin: "0 0 4px",
                }}
              >
                Entrate
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--color-success)",
                  margin: 0,
                }}
              >
                {formatCurrency(12500)}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  margin: "0 0 4px",
                }}
              >
                Uscite
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--color-error)",
                  margin: 0,
                }}
              >
                {formatCurrency(3480)}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 11,
                  color: "var(--text-tertiary)",
                  margin: "0 0 4px",
                }}
              >
                Bilancio
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {formatCurrency(9020)}
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* ── Card 3: Language ── */}
      <SettingsCard title="Language">
        <div>
          <h3
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: "#e8ff00",
              fontSize: 14,
              letterSpacing: "0.08em",
              margin: "0 0 8px",
            }}
          >
            LANGUAGE
          </h3>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLang(l.code);
                  setLanguage(l.code);
                }}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: `1px solid ${lang === l.code ? "#e8ff00" : "rgba(255,255,255,0.15)"}`,
                  background: lang === l.code ? "#e8ff00" : "transparent",
                  color: lang === l.code ? "#000" : "rgba(255,255,255,0.7)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
