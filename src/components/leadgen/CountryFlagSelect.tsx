// Flag emoji used here as explicit exception to no-emoji rule — country identification.
const COUNTRIES = [
  { code: "IT", label: "Italia",       flag: "🇮🇹" },
  { code: "FR", label: "Francia",      flag: "🇫🇷" },
  { code: "DE", label: "Germania",     flag: "🇩🇪" },
  { code: "ES", label: "Spagna",       flag: "🇪🇸" },
  { code: "GB", label: "Regno Unito",  flag: "🇬🇧" },
  { code: "US", label: "Stati Uniti",  flag: "🇺🇸" },
  { code: "CH", label: "Svizzera",     flag: "🇨🇭" },
  { code: "NL", label: "Paesi Bassi",  flag: "🇳🇱" },
  { code: "BE", label: "Belgio",       flag: "🇧🇪" },
  { code: "PT", label: "Portogallo",   flag: "🇵🇹" },
];

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function CountryFlagSelect({ value, onChange, disabled }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="glass-input"
      style={{ width: "100%" }}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.label} ({c.code})
        </option>
      ))}
    </select>
  );
}

export { COUNTRIES };
