import { Mail, Phone, Building2, MapPin, Hash, Briefcase } from "lucide-react";
import type { Profile } from "@/lib/profileStore";

interface Props {
  profile: Profile;
  onEdit: () => void;
}

export function QuickInfoCard({ profile, onEdit }: Props) {
  const items = [
    { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", value: profile.email },
    { icon: <Phone className="w-3.5 h-3.5" />, label: "Phone", value: profile.phone },
    { icon: <Hash className="w-3.5 h-3.5" />, label: "Tax ID", value: profile.tax_id },
    { icon: <Briefcase className="w-3.5 h-3.5" />, label: "Business", value: profile.business_type },
    { icon: <Building2 className="w-3.5 h-3.5" />, label: "Company", value: profile.company_name },
    { icon: <MapPin className="w-3.5 h-3.5" />, label: "Address", value: [profile.address_line_1, profile.city, profile.province].filter(Boolean).join(", ") || null },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2.5">
          <span style={{ color: "var(--text-quaternary)" }}>{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-quaternary)" }}>{item.label}</p>
            {item.value ? (
              <p className="text-[13px] truncate" style={{ color: "var(--text-primary)" }}>{item.value}</p>
            ) : (
              <button type="button" onClick={onEdit} className="text-[12px] font-medium" style={{ color: "var(--accent-color)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                + Add
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
