import { useState } from "react";
import { Check } from "lucide-react";

const PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#64748b",
];

interface SettingsColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function SettingsColorPicker({ value, onChange }: SettingsColorPickerProps) {
  const [custom, setCustom] = useState(PRESETS.includes(value) ? "" : value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => { onChange(color); setCustom(""); }}
            style={{
              width: 24, height: 24, borderRadius: "50%",
              background: color, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: value === color
                ? `0 0 0 2px var(--glass-bg-elevated, #111), 0 0 0 4px ${color}`
                : "none",
              transition: "box-shadow 0.15s",
            }}
          >
            {value === color && <Check style={{ width: 12, height: 12, color: "#fff", strokeWidth: 3 }} />}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={custom || value}
        onChange={(e) => {
          setCustom(e.target.value);
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            onChange(e.target.value);
          }
        }}
        placeholder="#hex"
        className="glass-input"
        style={{ width: 100, fontSize: 12, padding: "6px 10px" }}
      />
    </div>
  );
}
