import { Moon, Sun, Palette, Check } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAccent, ACCENT_PRESETS } from "@/lib/accent";
import { useNumberFormat } from "@/lib/numberFormat";
import {
  SettingsPageHeader,
  SettingsCard,
} from "@/components/settings";

export default function Appearance() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const { format, setFormat, formatCurrency } = useNumberFormat();

  return (
    <div style={{ maxWidth: 860 }}>
      <SettingsPageHeader
        icon={Palette}
        title="Aspetto"
        description="Personalizza il tema e i colori della piattaforma"
      />

      {/* ── Card 1: Tema ── */}
      <SettingsCard title="Tema">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Dark theme card */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "28px 20px",
              borderRadius: "var(--radius-lg)",
              background: "var(--glass-bg)",
              border:
                theme === "dark"
                  ? "1.5px solid var(--accent-primary)"
                  : "0.5px solid var(--glass-border)",
              boxShadow:
                theme === "dark"
                  ? "0 0 20px var(--accent-primary-glow, rgba(0,0,0,0.15))"
                  : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Moon
              size={28}
              style={{
                color:
                  theme === "dark"
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: theme === "dark" ? 600 : 500,
                color:
                  theme === "dark"
                    ? "var(--accent-primary)"
                    : "var(--text-secondary)",
              }}
            >
              Tema Scuro
            </span>
          </button>

          {/* Light theme card */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "28px 20px",
              borderRadius: "var(--radius-lg)",
              background: "var(--glass-bg)",
              border:
                theme === "light"
                  ? "1.5px solid var(--accent-primary)"
                  : "0.5px solid var(--glass-border)",
              boxShadow:
                theme === "light"
                  ? "0 0 20px var(--accent-primary-glow, rgba(0,0,0,0.15))"
                  : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Sun
              size={28}
              style={{
                color:
                  theme === "light"
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: theme === "light" ? 600 : 500,
                color:
                  theme === "light"
                    ? "var(--accent-primary)"
                    : "var(--text-secondary)",
              }}
            >
              Tema Chiaro
            </span>
          </button>
        </div>
      </SettingsCard>

      {/* ── Card 2: Colore Accento ── */}
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
    </div>
  );
}
